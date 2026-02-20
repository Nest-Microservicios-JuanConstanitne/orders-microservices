

import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {

  catch(exception: RpcException, host: ArgumentsHost) {

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const rpcError = exception.getError();

    // Si el error es un objeto
    if (typeof rpcError === 'object') {

      const status =
        !isNaN(+(rpcError as any).status)
          ? +(rpcError as any).status
          : !isNaN(+(rpcError as any).statusCode)
            ? +(rpcError as any).statusCode
            : 400;

      return response.status(status).json({
        status,
        message: (rpcError as any).message || rpcError,
      });
    }

    // Si es string
    return response.status(400).json({
      status: 400,
      message: rpcError,
    });

  }
}
