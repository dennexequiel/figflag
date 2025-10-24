import type { PublicFlagsResponse, Flag, Config } from '@figflag/shared'

export interface FigFlagClientOptions {
  baseUrl?: string
  projectSlug: string
  environment: string
  apiKey?: string
}

export class FigFlagClient {
  private baseUrl: string
  private projectSlug: string
  private environment: string
  private apiKey?: string

  constructor(options: FigFlagClientOptions) {
    this.baseUrl = options.baseUrl || 'https://api.figflag.com'
    this.projectSlug = options.projectSlug
    this.environment = options.environment
    this.apiKey = options.apiKey
  }

  /**
   * Get all flags and configs for the current environment
   */
  async getFlags(): Promise<Record<string, boolean>> {
    const response = await this.fetchPublicData()
    return response.flags
  }

  /**
   * Get all configs for the current environment
   */
  async getConfigs(): Promise<Record<string, any>> {
    const response = await this.fetchPublicData()
    return response.configs
  }

  /**
   * Check if a specific flag is enabled
   */
  async isEnabled(flagKey: string): Promise<boolean> {
    const flags = await this.getFlags()
    return flags[flagKey] || false
  }

  /**
   * Get a specific config value
   */
  async getConfig(configKey: string): Promise<any> {
    const configs = await this.getConfigs()
    return configs[configKey]
  }

  /**
   * Get all flags and configs in a single request
   */
  async getAll(): Promise<PublicFlagsResponse> {
    return this.fetchPublicData()
  }

  private async fetchPublicData(): Promise<PublicFlagsResponse> {
    const url = `${this.baseUrl}/public/${this.projectSlug}/${this.environment}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flags: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }
}

/**
 * Create a new FigFlag client instance
 */
export function createClient(options: FigFlagClientOptions): FigFlagClient {
  return new FigFlagClient(options)
}

/**
 * Default export for convenience
 */
export default FigFlagClient
