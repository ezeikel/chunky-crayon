import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faChevronRight } from "@fortawesome/free-solid-svg-icons";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

const Breadcrumbs = ({ items, className = "" }: BreadcrumbsProps) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href && {
        item: `https://coloringhabitat.com${item.href}`,
      }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex items-center flex-wrap gap-1 text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;

            return (
              <li key={item.label} className="flex items-center gap-1">
                {index > 0 && (
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="text-xs text-muted-foreground mx-1"
                  />
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isFirst && (
                      <FontAwesomeIcon
                        icon={faHouse}
                        className="text-sm text-primary"
                      />
                    )}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    {isFirst && (
                      <FontAwesomeIcon
                        icon={faHouse}
                        className="text-sm text-primary"
                      />
                    )}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumbs;
