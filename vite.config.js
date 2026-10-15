import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { requestAntworkToken } from './api/_antworkToken.js';

// Serves /api/antwork-token locally (on Vercel, api/antwork-token.js handles it)
function antworkTokenDevApi(env) {
    const middleware = async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') {
            res.statusCode = 405;
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
        try {
            const { status, body } = await requestAntworkToken(env);
            res.statusCode = status;
            res.end(JSON.stringify(body));
        } catch (error) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: error.message || 'Token service unreachable' }));
        }
    };
    return {
        name: 'antwork-token-dev-api',
        configureServer(server) { server.middlewares.use('/api/antwork-token', middleware); },
        configurePreviewServer(server) { server.middlewares.use('/api/antwork-token', middleware); },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react(), antworkTokenDevApi(env)],
        // secure-ant API sends no CORS headers; proxy it same-origin (vercel.json does this in prod)
        server: {
            proxy: {
                '/antwork-api': {
                    target: 'https://secure-ant.ant.works',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/antwork-api/, '/secure-api'),
                },
            },
        },
        build: {
        chunkSizeWarningLimit: 1500
        }
    };
});
