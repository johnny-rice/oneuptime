import * as opentelemetry from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import {
    ConsoleMetricExporter,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import Dictionary from 'Common/Types/Dictionary';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
    BatchLogRecordProcessor,
    ConsoleLogRecordExporter,
    LoggerProvider,
    SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import URL from 'Common/Types/API/URL';
import {
    ConsoleSpanExporter,
    SpanExporter,
} from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Logger, logs } from '@opentelemetry/api-logs';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';

export default class OneUptimeTelemetry {
    public static sdk: opentelemetry.NodeSDK | null = null;
    public static logger: Logger | null = null;

    public static getHeaders(): Dictionary<string> {
        if (!process.env['OTEL_EXPORTER_OTLP_HEADERS']) {
            return {};
        }

        const headersStrings: Array<string> =
            process.env['OTEL_EXPORTER_OTLP_HEADERS'].split(';');

        const headers: Dictionary<string> = {};

        for (const headerString of headersStrings) {
            const header: Array<string> = headerString.split('=');
            if (header.length === 2) {
                headers[header[0]!.toString()] = header[1]!.toString();
            }
        }

        return headers;
    }

    public static getOtlpEndpoint(): URL | null {
        if (!process.env['OTEL_EXPORTER_OTLP_ENDPOINT']) {
            return null;
        }

        return URL.fromString(process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || '');
    }

    public static getOltpLogsEndpoint(): URL | null {
        const oltpEndpoint: URL | null = this.getOtlpEndpoint();

        if (!oltpEndpoint) {
            return null;
        }

        return URL.fromString(oltpEndpoint.toString() + '/v1/logs');
    }

    public static getOltpMetricsEndpoint(): URL | null {
        const oltpEndpoint: URL | null = this.getOtlpEndpoint();

        if (!oltpEndpoint) {
            return null;
        }

        return URL.fromString(oltpEndpoint.toString() + '/v1/metrics');
    }

    public static getOltpTracesEndpoint(): URL | null {
        const oltpEndpoint: URL | null = this.getOtlpEndpoint();

        if (!oltpEndpoint) {
            return null;
        }

        return URL.fromString(oltpEndpoint.toString() + '/v1/traces');
    }

    public static getResource(data: { serviceName: string }): Resource {
        return new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: data.serviceName,
        });
    }

    public static init(data: { serviceName: string }): opentelemetry.NodeSDK {

        if (!this.sdk) {

            const headers: Dictionary<string> = this.getHeaders();

            console.log(headers);

            let traceExporter: SpanExporter = new ConsoleSpanExporter();

            let metricReader: PeriodicExportingMetricReader =
                new PeriodicExportingMetricReader({
                    exporter: new ConsoleMetricExporter(),
                });

            if (this.getOltpTracesEndpoint()) {
                traceExporter = new OTLPTraceExporter({
                    url: this.getOltpTracesEndpoint()!.toString(),
                    headers: headers,
                });
            }

            if (this.getOltpMetricsEndpoint()) {
                metricReader = new PeriodicExportingMetricReader({
                    exporter: new OTLPMetricExporter({
                        url: this.getOltpMetricsEndpoint()!.toString(),
                        headers: headers,
                    }),
                });
            }

            const loggerProvider: LoggerProvider = new LoggerProvider();

            if (this.getOltpLogsEndpoint()) {
                const logExporter: OTLPLogExporter = new OTLPLogExporter({
                    url: this.getOltpLogsEndpoint()!.toString(),
                    headers: headers,
                    compression: CompressionAlgorithm.GZIP, 
                });

                loggerProvider.addLogRecordProcessor(
                    new BatchLogRecordProcessor(logExporter)
                );
            }

            loggerProvider.addLogRecordProcessor(
                new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
            );

            logs.setGlobalLoggerProvider(loggerProvider);

            this.logger = logs.getLogger('default');

            const sdk: opentelemetry.NodeSDK = new opentelemetry.NodeSDK({
                idGenerator: new AWSXRayIdGenerator(),
                traceExporter: traceExporter,
                metricReader: metricReader as any,
                logRecordProcessor: loggerProvider as any,
                instrumentations: [
                    new HttpInstrumentation(),
                    new ExpressInstrumentation()
                ],
                resource: this.getResource({
                    serviceName: data.serviceName,
                }),
            });

            process.on('SIGTERM', () => {
                sdk.shutdown().finally(() => {
                    return process.exit(0);
                });
            });

            sdk.start();

            this.sdk = sdk;
        }

        return this.sdk;
    }

    public static getLogger(): Logger {
        if (!this.logger) {
            throw new Error('Logger not initialized');
        }

        return this.logger!;
    }
}

OneUptimeTelemetry.init({
    serviceName: process.env['SERVICE_NAME'] || 'oneuptime',
});
