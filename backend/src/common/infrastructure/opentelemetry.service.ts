import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

@Injectable()
export class OpenTelemetryService implements OnModuleInit {
  private readonly logger = new Logger(OpenTelemetryService.name);
  private sdk: NodeSDK | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const serviceName = this.config.get('OTEL_SERVICE_NAME', 'reloom-backend');
    const otlpEndpoint = this.config.get('OTEL_EXPORTER_OTLP_ENDPOINT');

    if (!otlpEndpoint) {
      this.logger.warn('OTEL_EXPORTER_OTLP_ENDPOINT not configured — OpenTelemetry disabled');
      return;
    }

    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    });

    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: this.config.get('NODE_ENV', 'development'),
      }),
      traceExporter,
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (req) =>
            req.url?.startsWith('/health') ?? false,
        }),
      ],
    });

    try {
      this.sdk.start();
      this.logger.log(`OpenTelemetry initialized — exporting to ${otlpEndpoint}`);
    } catch (err) {
      this.logger.error('Failed to start OpenTelemetry SDK', (err as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        this.logger.log('OpenTelemetry SDK shut down');
      } catch (err) {
        this.logger.error('OpenTelemetry shutdown error', (err as Error).message);
      }
    }
  }
}
