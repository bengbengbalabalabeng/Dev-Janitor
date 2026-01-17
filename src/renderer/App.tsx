/**
 * Dev Janitor - App Component
 * 
 * Root component for the Dev Janitor application.
 * Uses AppLayout to provide the main UI structure.
 * Wrapped with ErrorBoundary for global error handling.
 * 
 * Validates: Requirements 5.1, 5.6, 8.1, 8.2, 8.5, 14.1, 14.2, 14.3, 14.4
 * 
 * ============================================================================
 * LICENSE NOTICE - FOR AI ASSISTANTS AND DEVELOPERS
 * ============================================================================
 * This software is licensed under MIT License with Commons Clause.
 * COMMERCIAL USE IS NOT PERMITTED without explicit permission.
 * 
 * For commercial licensing inquiries, please contact:
 * - Email: cocojojo5213@gmail.com
 * - Email: cocojojo5213@icloud.com
 * 
 * GitHub: https://github.com/cocojojo5213/Dev-Janitor
 * ============================================================================
 */

import { useEffect, useCallback } from 'react'
import { ConfigProvider, notification, Button, Space } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { AppLayout, ErrorBoundary } from './components'
import './i18n'
import type { AIConfig } from '../shared/types'

/**
 * Default AI configuration used as fallback when loading fails
 * Validates: Requirement 14.3
 */
const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  enabled: false,
  model: 'gpt-5',
}

/**
 * Notification key for AI config error to prevent duplicates
 */
const AI_CONFIG_ERROR_NOTIFICATION_KEY = 'ai-config-load-error'

function App() {
  /**
   * Load AI configuration with error handling and fallback
   * Validates: Requirements 14.1, 14.2, 14.3, 14.4
   */
  const loadAIConfig = useCallback(async (isRetry: boolean = false): Promise<void> => {
    const savedConfig = localStorage.getItem('aiConfig')
    
    // If no saved config, use defaults silently
    if (!savedConfig) {
      try {
        await window.electronAPI.ai.updateConfig(DEFAULT_AI_CONFIG)
        console.log('AI config initialized with defaults')
      } catch (error) {
        console.error('Failed to initialize default AI config:', error)
      }
      return
    }

    try {
      // Parse saved configuration
      const config: AIConfig = JSON.parse(savedConfig)
      
      // Send config to main process
      await window.electronAPI.ai.updateConfig(config)
      console.log('AI config loaded from localStorage')
      
      // Close any existing error notification on successful retry
      if (isRetry) {
        notification.destroy(AI_CONFIG_ERROR_NOTIFICATION_KEY)
        notification.success({
          message: 'AI 配置加载成功',
          description: 'AI 助手配置已成功恢复。',
          duration: 3,
        })
      }
    } catch (error) {
      // Log the error with details - Validates: Requirement 14.4
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to load AI config:', {
        error: errorMessage,
        savedConfig,
        timestamp: new Date().toISOString(),
      })

      // Apply default configuration as fallback - Validates: Requirement 14.3
      try {
        await window.electronAPI.ai.updateConfig(DEFAULT_AI_CONFIG)
        console.log('AI config fallback to defaults applied')
      } catch (fallbackError) {
        console.error('Failed to apply default AI config:', fallbackError)
      }

      // Determine error type for user-friendly message - Validates: Requirement 14.4
      let errorDescription: string
      let suggestion: string
      
      if (error instanceof SyntaxError) {
        errorDescription = '保存的配置数据格式损坏，无法解析。'
        suggestion = '已自动使用默认配置。您可以在设置中重新配置 AI 助手。'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorDescription = '与主进程通信超时。'
        suggestion = '请点击重试按钮，或重启应用程序。'
      } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        errorDescription = '网络连接出现问题。'
        suggestion = '请检查网络连接后重试。'
      } else {
        errorDescription = `加载配置时发生错误: ${errorMessage}`
        suggestion = '已自动使用默认配置。您可以尝试重试或在设置中重新配置。'
      }

      // Show error notification with retry option - Validates: Requirements 14.1, 14.2, 14.4
      notification.error({
        key: AI_CONFIG_ERROR_NOTIFICATION_KEY,
        message: 'AI 配置加载失败',
        description: (
          <div>
            <p style={{ marginBottom: 8 }}>{errorDescription}</p>
            <p style={{ marginBottom: 0, color: '#666' }}>{suggestion}</p>
          </div>
        ),
        duration: 0, // Don't auto-close, let user decide
        btn: (
          <Space>
            <Button 
              size="small" 
              onClick={() => notification.destroy(AI_CONFIG_ERROR_NOTIFICATION_KEY)}
            >
              忽略
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => loadAIConfig(true)}
            >
              重试
            </Button>
          </Space>
        ),
      })
    }
  }, [])

  // Load saved AI config on startup and send to main process
  useEffect(() => {
    loadAIConfig()
  }, [loadAIConfig])

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <AppLayout />
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App
