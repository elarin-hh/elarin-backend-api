import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let error = 'ERRO_INTERNO';

    const defaultMessages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Requisição inválida',
      [HttpStatus.UNAUTHORIZED]: 'Não autorizado',
      [HttpStatus.FORBIDDEN]: 'Acesso negado',
      [HttpStatus.NOT_FOUND]: 'Recurso não encontrado',
      [HttpStatus.CONFLICT]: 'Conflito de dados',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas requisições. Tente novamente mais tarde',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno do servidor',
    };

    const defaultErrors: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'REQUISICAO_INVALIDA',
      [HttpStatus.UNAUTHORIZED]: 'NAO_AUTORIZADO',
      [HttpStatus.FORBIDDEN]: 'ACESSO_NEGADO',
      [HttpStatus.NOT_FOUND]: 'RECURSO_NAO_ENCONTRADO',
      [HttpStatus.CONFLICT]: 'CONFLITO',
      [HttpStatus.TOO_MANY_REQUESTS]: 'MUITAS_REQUISICOES',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'ERRO_INTERNO',
    };

    const englishDefaults = new Set([
      'Bad Request',
      'Unauthorized',
      'Forbidden',
      'Not Found',
      'Conflict',
      'Too Many Requests',
      'Internal Server Error',
    ]);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseMessage = (exceptionResponse as any).message;
        if (Array.isArray(responseMessage)) {
          message = responseMessage.join('; ');
        } else if (responseMessage) {
          message = responseMessage;
        }
        const responseError = (exceptionResponse as any).error;
        if (typeof responseError === 'string') {
          error = responseError;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error('Exceção não tratada', exception.stack);
    } else {
      this.logger.error('Exceção não tratada');
    }

    if (!message || englishDefaults.has(message)) {
      message = defaultMessages[status] || defaultMessages[HttpStatus.INTERNAL_SERVER_ERROR];
    }

    if (!error || englishDefaults.has(error)) {
      error = defaultErrors[status] || defaultErrors[HttpStatus.INTERNAL_SERVER_ERROR];
    }

    response.status(status).send({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
