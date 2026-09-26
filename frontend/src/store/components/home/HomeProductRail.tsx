import { Link } from 'react-router-dom';
import { ProductCard, type ProductCardData } from '../product/ProductCard';
import { useLocale } from '../../providers/locale-provider';

export function HomeProductRail({
  title,
  icon,
  products,
  shopLink,
}: {
  title: string;
  icon: React.ReactNode;
  products: ProductCardData[];
  shopLink?: string;
}) {
  const { t } = useLocale();

  if (products.length === 0) return null;

  return (
    <section className="home-rail-section">
      <div className="section-head mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="section-title text-base font-bold">{title}</h2>
        </div>
        {shopLink ? (
          <Link to={shopLink} className="section-link shrink-0 text-xs">
            {t.viewAll}
          </Link>
        ) : null}
      </div>
      <div id={`rail-${title}`} className="home-product-rail hide-scrollbar flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} compact rail />
        ))}
      </div>
    </section>
  );
}
