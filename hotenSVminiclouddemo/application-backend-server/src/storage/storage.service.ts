import { Inject, Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { STORAGE_MODULE_OPTIONS, StorageModuleOptions, UploadUrlResult } from './storage.constants';

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_MODULE_OPTIONS) private readonly options: StorageModuleOptions) {}

  createUploadUrl(filename: string, contentType: string): UploadUrlResult {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const objectKey = `${this.options.objectPrefix}/${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedFilename}`;
    const internalObjectPath = `/${this.options.bucketName}/${this.encodePath(objectKey)}`;
    const publicObjectPath = `/storage/${this.options.bucketName}/${this.encodePath(objectKey)}`;
    const publicBaseUrl = this.normalizePublicBaseUrl(this.options.publicBaseUrl);

    return {
      uploadUrl: this.buildPresignedPutUrl({
        host: new URL(publicBaseUrl).host,
        baseUrl: publicBaseUrl,
        canonicalPath: internalObjectPath,
        publicPath: publicObjectPath,
        contentType
      }),
      publicUrl: this.buildPresignedGetUrl({
        host: new URL(publicBaseUrl).host,
        baseUrl: publicBaseUrl,
        canonicalPath: internalObjectPath,
        publicPath: publicObjectPath
      }),
      bucket: this.options.bucketName,
      objectKey,
      headers: {
        'Content-Type': contentType
      }
    };
  }

  private buildPresignedPutUrl(input: {
    host: string;
    baseUrl: string;
    canonicalPath: string;
    publicPath: string;
    contentType: string;
  }): string {
    const method = 'PUT';
    const region = this.options.region ?? 'us-east-1';
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const signedHeaders = 'content-type;host';
    const queryParams: Array<[string, string]> = [
      ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', `${this.options.accessKey}/${credentialScope}`],
      ['X-Amz-Date', amzDate],
      ['X-Amz-Expires', '900'],
      ['X-Amz-SignedHeaders', signedHeaders]
    ];

    const canonicalQuery = this.buildCanonicalQuery(queryParams);
    const canonicalHeaders = `content-type:${input.contentType.trim()}\nhost:${input.host.toLowerCase()}\n`;
    const canonicalRequest = ['PUT', input.canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signingKey = this.getSigningKey(this.options.secretKey, dateStamp, region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return `${this.joinUrl(input.baseUrl, input.publicPath)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  private buildPresignedGetUrl(input: {
    host: string;
    baseUrl: string;
    canonicalPath: string;
    publicPath: string;
  }): string {
    const method = 'GET';
    const region = this.options.region ?? 'us-east-1';
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const signedHeaders = 'host';
    const queryParams: Array<[string, string]> = [
      ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', `${this.options.accessKey}/${credentialScope}`],
      ['X-Amz-Date', amzDate],
      ['X-Amz-Expires', '900'],
      ['X-Amz-SignedHeaders', signedHeaders]
    ];

    const canonicalQuery = this.buildCanonicalQuery(queryParams);
    const canonicalHeaders = `host:${input.host.toLowerCase()}\n`;
    const canonicalRequest = [method, input.canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signingKey = this.getSigningKey(this.options.secretKey, dateStamp, region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return `${this.joinUrl(input.baseUrl, input.publicPath)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  private getSigningKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(regionName).digest();
    const kService = createHmac('sha256', kRegion).update(serviceName).digest();
    return createHmac('sha256', kService).update('aws4_request').digest();
  }

  private buildCanonicalQuery(params: Array<[string, string]>): string {
    return params
      .map(([key, value]) => [this.awsEncode(key), this.awsEncode(value)] as const)
      .sort((left, right) => {
        if (left[0] === right[0]) {
          return left[1].localeCompare(right[1]);
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  private sanitizeFilename(filename: string): string {
    const parsed = basename(filename.trim());
    const extension = extname(parsed).toLowerCase();
    const stem = basename(parsed, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const safeStem = stem || 'file';
    const safeExtension = extension.replace(/[^a-z0-9.]/g, '');
    return `${safeStem}${safeExtension}`;
  }

  private encodePath(pathValue: string): string {
    return pathValue
      .split('/')
      .map((segment) => this.awsEncode(segment))
      .join('/');
  }

  private joinUrl(baseUrl: string, pathValue: string): string {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private normalizePublicBaseUrl(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    if (normalized.endsWith('/storage')) {
      return normalized.slice(0, -'/storage'.length);
    }

    return normalized;
  }

  private toAmzDate(date: Date): string {
    const pad = (input: number): string => input.toString().padStart(2, '0');
    return [
      date.getUTCFullYear().toString(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate())
    ].join('') + 'T' + [pad(date.getUTCHours()), pad(date.getUTCMinutes()), pad(date.getUTCSeconds())].join('') + 'Z';
  }

  private awsEncode(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  }
}
