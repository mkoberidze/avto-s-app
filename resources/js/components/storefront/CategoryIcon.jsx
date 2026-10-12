import React from 'react';
import { Cable, Flame, House, KeyRound, Network, Radio, ShieldAlert, Video } from 'lucide-react';

const ICONS = {
    32: Video,
    77: Flame,
    66: KeyRound,
    61: ShieldAlert,
    155: Radio,
    103: House,
    85: Network,
    70: Cable,
};

export default function CategoryIcon({ id, className = 'h-6 w-6' }) {
    const Icon = ICONS[Number(id)] || Video;
    return <Icon className={className} aria-hidden="true" />;
}
