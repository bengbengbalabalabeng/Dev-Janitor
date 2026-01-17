/**
 * MarkdownErrorBoundary Component
 * 
 * A specialized React error boundary for catching errors in Markdown rendering.
 * Provides a fallback UI with retry functionality when Markdown content fails to render.
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 * - 9.1: Wrap Markdown rendering area with Error_Boundary
 * - 9.2: Display friendly error message when Markdown rendering fails
 * - 9.3: Provide retry button to re-render content
 * - 9.4: Log error details to console when error occurs
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

import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

// ============================================================================
// Types
// ============================================================================

export interface MarkdownErrorBoundaryProps {
  /** Child components to render (typically Markdown content) */
  children: ReactNode
  /** Optional custom fallback UI */
  fallback?: ReactNode
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Optional callback when retry is clicked */
  onRetry?: () => void
  /** Whether to show error details (default: false for cleaner UI) */
  showDetails?: boolean
}

export interface MarkdownErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean
  /** The caught error object */
  error: Error | null
  /** React error info with component stack */
  errorInfo: ErrorInfo | null
}

// ============================================================================
// Error Logging Utility
// ============================================================================

/**
 * Log Markdown rendering error details with timestamp
 * Validates: Requirement 9.4
 */
function logMarkdownError(
  error: Error, 
  errorInfo: ErrorInfo, 
  additionalInfo?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  const errorLog = {
    timestamp,
    context: 'MarkdownErrorBoundary',
    message: error.message,
    name: error.name,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    ...additionalInfo,
  }
  
  // Log to console - Validates: Requirement 9.4
  console.error('[Markdown Rendering Error]', errorLog)
  
  // Enhanced logging in development mode
  if (typeof window !== 'undefined' && (window as { __DEV__?: boolean }).__DEV__) {
    console.group('🔴 Markdown Rendering Error')
    console.error('Error:', error)
    console.error('Timestamp:', timestamp)
    console.error('Component Stack:', errorInfo.componentStack)
    if (additionalInfo) {
      console.error('Additional Info:', additionalInfo)
    }
    console.groupEnd()
  }
}

// ============================================================================
// MarkdownErrorBoundary Component
// ============================================================================

/**
 * MarkdownErrorBoundary
 * 
 * A specialized error boundary for Markdown rendering that:
 * 1. Catches rendering errors in child components (Requirement 9.1)
 * 2. Displays a fallback UI when errors occur (Requirement 9.2)
 * 3. Provides a retry button to attempt re-rendering (Requirement 9.3)
 * 4. Logs errors for debugging (Requirement 9.4)
 */
export class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps, 
  MarkdownErrorBoundaryState
> {
  constructor(props: MarkdownErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  /**
   * Update state when an error is caught
   * This is called during the "render" phase
   */
  static getDerivedStateFromError(error: Error): Partial<MarkdownErrorBoundaryState> {
    return { hasError: true, error }
  }

  /**
   * Log error details and call optional error handler
   * This is called during the "commit" phase
   * Validates: Requirement 9.4
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info in state
    this.setState({ errorInfo })

    // Log the error - Validates: Requirement 9.4
    logMarkdownError(error, errorInfo)

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Reset error state and attempt to re-render
   * Validates: Requirement 9.3
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Call optional retry handler
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  /**
   * Render the fallback UI when an error occurs
   * Validates: Requirement 9.2
   */
  renderFallbackUI(): ReactNode {
    const { error, errorInfo } = this.state
    const { showDetails = false } = this.props

    return (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="Content Rendering Failed"
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              Unable to render the content. This may be due to invalid formatting.
            </Text>
            
            {/* Retry button - Validates: Requirement 9.3 */}
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={this.handleRetry}
            >
              Retry
            </Button>

            {/* Optional error details */}
            {showDetails && error && (
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: '12px' }}>Error Details:</Text>
                <Paragraph
                  code
                  style={{ 
                    fontSize: '11px', 
                    maxHeight: '100px', 
                    overflow: 'auto',
                    margin: '4px 0 0 0',
                    padding: '8px',
                    background: '#f5f5f5',
                    borderRadius: '4px'
                  }}
                >
                  {error.message}
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {errorInfo.componentStack}
                    </>
                  )}
                </Paragraph>
              </div>
            )}
          </Space>
        }
        style={{
          margin: '8px 0',
          borderRadius: '8px',
        }}
      />
    )
  }

  render(): ReactNode {
    const { hasError } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Use custom fallback if provided, otherwise use default fallback UI
      // Validates: Requirement 9.2
      if (fallback) {
        return fallback
      }
      return this.renderFallbackUI()
    }

    // No error, render children normally
    return children
  }
}

export default MarkdownErrorBoundary
