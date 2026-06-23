import { NextResponse } from 'next/server';
import net from 'net';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get('host') || process.env.MIKROTIK_HOST || '192.168.88.1';
  const port = parseInt(searchParams.get('port') || '8728');

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const startTime = Date.now();

    socket.setTimeout(3000);

    socket.on('connect', () => {
      const duration = Date.now() - startTime;
      socket.destroy();
      resolve(NextResponse.json({
        success: true,
        message: `Port ${port} is OPEN on ${host}!`,
        details: `Connection established in ${duration}ms. Your app can now talk to the router.`
      }));
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(NextResponse.json({
        success: false,
        message: `Port ${port} TIMEOUT on ${host}`,
        error: "TIMEOUT",
        tip: "This usually means a physical cable issue or a Firewall on the MikroTik is blocking your computer."
      }));
    });

    socket.on('error', (err: any) => {
      socket.destroy();
      resolve(NextResponse.json({
        success: false,
        message: `Port ${port} CLOSED on ${host}`,
        error: err.code,
        tip: err.code === 'ECONNREFUSED'
          ? "The router is active but the 'api' service is DISABLED. Enable it in WinBox > IP > Services."
          : "Check if the IP address is correct."
      }));
    });

    socket.connect(port, host);
  });
}
