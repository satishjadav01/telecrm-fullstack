import { Button, Card, Chip } from '@heroui/react'
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Intentionally minimal. Later we can send this to Sentry/logging.
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
        <Card className="glass w-full max-w-lg rounded-3xl">
          <Card.Header className="flex flex-col items-start gap-2">
            <Chip className="bg-[#fce8df] text-[#9a3e19]" variant="flat">
              UI Error
            </Chip>
            <p className="text-2xl font-semibold">Something went wrong</p>
            <p className="muted text-sm">
              {this.state.error?.message || 'An unexpected error occurred in the UI.'}
            </p>
          </Card.Header>
          <Card.Content className="space-y-3">
            <Button className="w-full bg-[#cb5f31] text-white" onPress={this.reset}>
              Try again
            </Button>
            <Button
              className="w-full border border-black/10 bg-white/75 text-black"
              onPress={() => window.location.reload()}
            >
              Reload page
            </Button>
          </Card.Content>
        </Card>
      </div>
    )
  }
}

export default ErrorBoundary

