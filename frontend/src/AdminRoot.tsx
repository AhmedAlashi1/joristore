import 'antd/dist/reset.css';
import './index.css';
import { App as AntdApp } from 'antd';
import { I18nProvider } from './providers/i18n-provider';
import AdminApp from './AdminApp';

/** Admin panel shell — styles isolated from storefront */
export function AdminRoot() {
  return (
    <div className="admin-app min-h-full">
      <I18nProvider>
        <AntdApp>
          <AdminApp />
        </AntdApp>
      </I18nProvider>
    </div>
  );
}
