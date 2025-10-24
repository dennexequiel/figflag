export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Environment {
  id: string
  projectId: string
  name: string
  slug: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Flag {
  id: string
  projectId: string
  environmentId: string
  key: string
  name: string
  description?: string
  enabled: boolean
  defaultValue?: any
  createdAt: Date
  updatedAt: Date
}

export interface Config {
  id: string
  projectId: string
  environmentId: string
  key: string
  name: string
  description?: string
  value: any
  createdAt: Date
  updatedAt: Date
}

export interface PublicFlagsResponse {
  flags: Record<string, boolean>
  configs: Record<string, any>
  timestamp: Date
}

export interface CreateFlagRequest {
  key: string
  name: string
  description?: string
  enabled: boolean
  defaultValue?: any
}

export interface UpdateFlagRequest {
  name?: string
  description?: string
  enabled?: boolean
  defaultValue?: any
}

export interface CreateConfigRequest {
  key: string
  name: string
  description?: string
  value: any
}

export interface UpdateConfigRequest {
  name?: string
  description?: string
  value?: any
}
