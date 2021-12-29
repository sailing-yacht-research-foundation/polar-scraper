import winston from 'winston';
import path from 'path';
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, service, timestamp }) => {
  return `${timestamp} [${service}] ${level}: ${message}`;
});
const logFolder = path.resolve(__dirname, '../logs');

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'blue',
});

const logger = createLogger({
  format: combine(errors({ stack: true }), timestamp(), logFormat),
  defaultMeta: { service: 'polar-scraper' },
  exceptionHandlers: [
    new transports.File({ filename: `${logFolder}/exceptions.log` }),
    new transports.Console({
      format: combine(colorize({ all: true }), timestamp(), logFormat),
    }),
  ],
});

if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new transports.File({
      filename: `${logFolder}/error.log`,
      level: 'error',
    }),
  );
  logger.add(
    new transports.Console({
      format: combine(colorize({ all: true }), timestamp(), logFormat),
      level: 'info',
    }),
  );
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new transports.File({
        filename: `${logFolder}/combined.log`,
        level: 'info',
      }),
    );
  }
}

export default logger;
