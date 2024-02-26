import { CSSServer } from "./CSSServer";

describe('CSSServer', () => {
    let server: CSSServer;
    beforeEach(() => {
        server = new CSSServer();
    });
    afterEach(() => {
        server.stop();
    });
    it('it_should_start_the_css_server', async () => {
        await server.start('src/server/aggregator-pod/config.json').then(() => {
            expect(server).toBeDefined();
        });
        await fetch('http://localhost:3000/').then((response) => {
            expect(response.status).toBe(200);
        });
    });
});