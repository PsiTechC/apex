import { NextResponse } from 'next/server';

export function withCORS(handler) {
  return async (req, ...args) => {
    // Preflight request (OPTIONS)
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': process.env.BASE_URL || '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Actual request
    const res = await handler(req, ...args);

    res.headers.set('Access-Control-Allow-Origin', process.env.BASE_URL || '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res;
  };
}
