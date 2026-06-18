import React from 'react';
import { Button, Result } from 'antd';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Talk2Campus page error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Result
        status="warning"
        title="This page hit an unexpected problem"
        subTitle="Your account and saved information are safe. Reload the page to try again."
        extra={<Button type="primary" onClick={() => window.location.reload()}>Reload page</Button>}
      />
    );
  }
}

export default AppErrorBoundary;
