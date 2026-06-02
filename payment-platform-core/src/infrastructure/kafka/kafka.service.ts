import { Kafka, Producer } from 'kafkajs';
import { logger } from '../../../../shared/logger/logger.ts';

export class KafkaService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private brokerList: string[];

  constructor() {
    const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    this.brokerList = brokers.split(',');
    
    // Disable Kafka for pure offline/local test if env is set
    if (process.env.KAFKA_ENABLED === 'false') {
      logger.info('Kafka is disabled via env configuration. Using simulated events.');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: 'payment-orchestrator',
        brokers: this.brokerList,
        retry: {
          retries: 2,
          restartOnFailure: async () => false
        }
      });
      this.producer = this.kafka.producer();
    } catch (error) {
      logger.warn('Failed to initialize Kafka client. Falling back to log simulation.');
    }
  }

  public async connect(): Promise<void> {
    if (!this.producer) return;
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Successfully connected to Apache Kafka broker(s)');
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Failed to connect to Kafka brokers. Operating in SIMULATION mode.');
      this.isConnected = false;
    }
  }

  public async publish(topic: string, key: string, payload: any): Promise<boolean> {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    if (this.isConnected && this.producer) {
      try {
        await this.producer.send({
          topic,
          messages: [{ key, value: payloadStr }]
        });
        logger.info({ topic, key }, 'Published event to Kafka');
        return true;
      } catch (error: any) {
        logger.error({ topic, error: error.message }, 'Error publishing to Kafka');
        return false;
      }
    } else {
      // Simulation mode
      logger.info({ topic, key, payload }, '[SIMULATED KAFKA EVENT PUBLISHED]');
      return true;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }
}

export const kafkaService = new KafkaService();
