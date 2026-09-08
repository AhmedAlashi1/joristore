import { App as AntdApp } from 'antd';
import { useCallback, useMemo } from 'react';
import { getApiErrorMessage } from './http-error';

export function useNotify() {
  const { notification } = AntdApp.useApp();

  const success = useCallback((message: string) => {
    notification.success({
      message,
      placement: 'topRight',
      duration: 2.4,
      className: 'rs-notify rs-notify-success',
    });
  }, [notification]);

  const error = useCallback((message: string) => {
    notification.error({
      message,
      placement: 'topRight',
      duration: 3,
      className: 'rs-notify rs-notify-error',
    });
  }, [notification]);

  const errorFrom = useCallback((err: unknown, fallback: string) => {
    error(getApiErrorMessage(err, fallback));
  }, [error]);

  return useMemo(() => ({ success, error, errorFrom }), [success, error, errorFrom]);
}
