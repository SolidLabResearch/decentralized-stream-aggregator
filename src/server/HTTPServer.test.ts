// import { CSSServer } from "./CSSServer";
// import { HTTPServer } from "./HTTPServer";

// describe('HTTPServer', () => {
//   const port: number = 8080;
//   let css_server: CSSServer = new CSSServer();
//   let http_server: HTTPServer;
//   beforeEach(() => {
//     css_server.start('scripts/pod/config/unsafe.json');
//     http_server = new HTTPServer(port, 'http://localhost:3000', {});
//   });
//   afterEach(() => {
//     css_server.stop();
//   });


//   it('handles GET requests', () => {
//     // Test that the request_handler method handles GET requests
//   HTTPServer.    
//   });
// });
import { HttpError } from "koa";
import { CSSServer } from "./CSSServer";
import { HTTPServer } from "./HTTPServer";

describe('HTTPServer', () => {
  const port: number = 8080;
  let css_server: CSSServer = new CSSServer();
  let http_server: HTTPServer;
  beforeEach(() => {
    css_server.start('scripts/pod/config/unsafe.json');
    http_server = new HTTPServer(port, 'http://localhost:3000', {});
  });
  afterEach(() => {
    css_server.stop();
    http_server.close();
  });

  it('handles GET requests', () => {
    // Test that the request_handler method handles GET requests
    const req: any = {
      method: 'GET',
      url: '/test'
    };
    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn()
    };
    http_server['request_handler'](req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'OPTIONS, GET');
    expect(res.end).toHaveBeenCalled();
  });

  it('handles POST requests', () => {
    // Test that the request_handler method handles POST requests
    const req: any = {
      method: 'POST',
      url: '/registerQuery',
      on: jest.fn((event: string, callback: any) => {
        if (event === 'data') {
          callback(Buffer.from(JSON.stringify({ type: 'Add' })));
        } else if (event === 'end') {
          callback();
        }
      })
    };
    const res: any = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn()
    };
    http_server['request_handler'](req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'OPTIONS, GET');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Length': 0
    });
    expect(res.end).toHaveBeenCalled();
  });

  it('handles unsupported requests', () => {
    // Test that the request_handler method handles unsupported requests
    const req: any = {
      method: 'PUT',
      url: '/test'
    };
    const res: any = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
    http_server['request_handler'](req, res);
    expect(res.writeHead).toHaveBeenCalledWith(405, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalled();
  });
});