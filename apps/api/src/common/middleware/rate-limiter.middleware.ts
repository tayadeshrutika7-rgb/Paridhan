import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly windowMs = 60 * 1000; // 1 minute window
  private readonly maxRequestsPerWindow = 120; // 120 requests/min per IP
  private readonly authMaxRequestsPerWindow = 20; // 20 requests/min for auth
  private readonly ipMap = new Map<string, RateLimitRecord>();

  use(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const isAuthRoute = req.path.includes('/auth/') || req.path.includes('/login');
    const maxLimit = isAuthRoute ? this.authMaxRequestsPerWindow : this.maxRequestsPerWindow;
    const now = Date.now();

    const record = this.ipMap.get(ip);

    if (!record || now > record.resetTime) {
      this.ipMap.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      res.setHeader('X-RateLimit-Limit', maxLimit);
      res.setHeader('X-RateLimit-Remaining', maxLimit - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, maxLimit - record.count);
    res.setHeader('X-RateLimit-Limit', maxLimit);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > maxLimit) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests, please try again later.',
        error: 'Too Many Requests',
      });
    }

    next();
  }
}
