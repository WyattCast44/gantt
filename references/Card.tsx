import { cn } from '@/utils/cn';

type CardPadding = 'none' | 'sm' | 'md';

interface CardBaseProps {
    padding?: CardPadding;
    hoverable?: boolean;
    className?: string;
    children: React.ReactNode;
}

type AsDiv = CardBaseProps & {
    as?: 'div';
    href?: never;
};

type AsComponent = CardBaseProps & {
    as: React.ComponentType<any>;
    href: string;
    [key: string]: any;
};

type CardProps = AsDiv | AsComponent;

const paddingClasses: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
};

export default function Card(props: CardProps) {
    const { as: Component, padding = 'sm', hoverable, className, children, ...rest } = props;

    const classes = cn(
        'rounded-lg border border-border bg-white dark:border-border-dark dark:bg-neutral-900',
        paddingClasses[padding],
        hoverable && 'transition hover:bg-slate-50 dark:hover:bg-neutral-800/80',
        className,
    );

    if (Component) {
        return (
            <Component className={classes} {...rest}>
                {children}
            </Component>
        );
    }

    return (
        <div className={classes}>
            {children}
        </div>
    );
}
