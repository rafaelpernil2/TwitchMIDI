import NanoTimer from 'nanotimer';
import https from 'https';
import http from 'http';
import { isJsonString } from './data';

export async function setTimeoutPromise(timeout: number) {
    const timer = new NanoTimer();
    return new Promise((resolve) => {
        timer.setTimeout(resolve, '', String(timeout) + 'n');
    });
}

export async function httpsRequestPromise<T>(options: https.RequestOptions): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: T | string }> {
    return new Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: T | string }>((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => (body += String(chunk)));
            res.on('error', reject);
            res.on('end', () => {
                const { statusCode, headers } = res;
                if (statusCode != null && statusCode >= 200 && statusCode <= 299) {
                    resolve({ statusCode, headers, body: isJsonString(body) ? (JSON.parse(body) as T) : body });
                } else {
                    reject('Request failed. status: ' + String(statusCode) + ', body: ' + body);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}
