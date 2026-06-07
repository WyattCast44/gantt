import type { PaymentStatusType } from '@/types';
import Badge from '@/Components/Badge';

interface PaymentStatusBadgeProps {
    status: PaymentStatusType;
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
    const variant = status === 'paid' ? 'success' : status === 'missed' ? 'danger' : 'default';
    const label = status.charAt(0).toUpperCase() + status.slice(1);

    return <Badge variant={variant}>{label}</Badge>;
}
