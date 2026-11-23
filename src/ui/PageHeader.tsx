import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export function PageHeader({ title, subtitle, back, action, onTitleClick }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { to: string; label: string } | { onClick: () => void; label: string };
  action?: React.ReactNode;
  onTitleClick?: () => void;
}) {
  return (
    <header className="page-header">
      {back && (
        'to' in back ? (
          <Link to={back.to} className="back"><Icon name="back" size={18} />{back.label}</Link>
        ) : (
          <button type="button" className="back" onClick={back.onClick}><Icon name="back" size={18} />{back.label}</button>
        )
      )}
      {(title || action) && (
        <div className="page-title-row">
          <h1 onClick={onTitleClick} className={onTitleClick ? 'editable' : undefined}>{title}</h1>
          {action}
        </div>
      )}
      {subtitle && <div className="page-subtitle">{subtitle}</div>}
    </header>
  );
}
