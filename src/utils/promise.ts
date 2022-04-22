import NanoTimer from 'nanotimer';
import https from 'https';
import http from 'http';
import { isJsonString } from './generic';

/**
 * Creates a promise that resolves in a determined amount of nanoseconds
 * @param timeout Timeout in nanoseconds
 * @returns
 */
export async function setTimeoutPromise(timeout: number): Promise<void> {
    const timer = new NanoTimer();
    return new Promise((resolve) => {
        timer.setTimeout(resolve, '', String(timeout) + 'n');
    });
}

/**
 * Conversion of https.request to Promise
 * @param options https.RequestOptions
 * @returns A promise with statusCode, headers and body
 */
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
        req.on('error', (error) => reject(error));
        req.end();
    });
}
