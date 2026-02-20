import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';
import { firstValueFrom } from 'rxjs';
import { PRODUCT_SERVICE } from 'src/config';

@Injectable()
export class OrdersService {

  constructor(
    private prisma: PrismaService,
    @Inject(PRODUCT_SERVICE) private readonly productService: ClientProxy

  ) { }

  async create(createOrderDto: CreateOrderDto) {

    const productIds = [
      ...new Set(createOrderDto.items.map(item => item.productId))
    ];

    // Es un observable
    // NO::: const validateProducts = await this.productService.send({ cmd: 'validate_products' }, { productIds });

    try {
      // 1. Consumir microservicio
      const products = await firstValueFrom(
        this.productService.send({ cmd: 'validate_products' }, productIds)
      );

      // 2. Calculo de los valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;
        return price * orderItem.quantity
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity
      }, 0);

      // 3. Transaccion bd
      const order = await this.prisma.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(product => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              }))
            }
          }
        },
        include:
        {
          OrderItem: {
            select: {
              productId: true,
              price: true,
              quantity: true
            }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find(prod => prod.id === orderItem.productId).name
        }))
      };

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs'
      });
    }



    /* const order = await this.prisma.order.create({
      data: createOrderDto
    });

    return order; */
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const totalPages = await this.prisma.order.count({
      where: {
        status: orderPaginationDto.status
      }
    });

    const currentPage = orderPaginationDto.page || 1;
    const perPage = orderPaginationDto.limit || 10;

    return {
      data: await this.prisma.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage)
      }
    }
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: id
      },
      include: {
        OrderItem: {
          select: {
            productId: true,
            price: true,
            quantity: true
          }
        }
      }
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with Id ${id} not found`
      });
    }

    const productIds = order.OrderItem.map(orderItem => orderItem.productId);

    const products = await firstValueFrom(
      this.productService.send({ cmd: 'validate_products' }, productIds)
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find(prod => prod.id === orderItem.productId).name
      }))
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);
    if (order.status === status) {
      return order;
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: status }
    });


  }


}
