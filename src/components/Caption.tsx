import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Gaegu';
import {COLORS} from '../constants';

const {fontFamily} = loadFont();

export const Caption: React.FC<{
	text: string; // wrap emphasized words in **like this**
	from: number; // local frame (within parent Sequence) when caption starts
	durationInFrames: number;
	fontSize?: number;
	maxWidth?: number;
	align?: 'left' | 'center';
	vAlign?: 'top' | 'center' | 'bottom';
	sidePadding?: number;
	edgePadding?: number;
	chip?: boolean;
}> = ({
	text,
	from,
	durationInFrames,
	fontSize = 52,
	maxWidth = 920,
	align = 'center',
	vAlign = 'bottom',
	sidePadding = 64,
	edgePadding = 140,
	chip = true,
}) => {
	const frame = useCurrentFrame();
	const local = frame - from;
	if (local < 0 || local > durationInFrames) {
		return null;
	}

	const fadeIn = 12;
	const fadeOut = 12;
	const opacity = interpolate(
		local,
		[0, fadeIn, durationInFrames - fadeOut, durationInFrames],
		[0, 1, 1, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const translateY = interpolate(local, [0, fadeIn], [18, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});

	const parts = text.split(/(\*\*[^*]+\*\*)/g);

	const vJustify = vAlign === 'top' ? 'flex-start' : vAlign === 'center' ? 'center' : 'flex-end';

	return (
		<AbsoluteFill
			style={{
				justifyContent: vJustify,
				alignItems: 'center',
				padding: `0 ${sidePadding}px`,
				paddingBottom: vAlign === 'bottom' ? edgePadding : 0,
				paddingTop: vAlign === 'top' ? edgePadding : 0,
				pointerEvents: 'none',
			}}
		>
			<div
				style={{
					opacity,
					transform: `translateY(${translateY}px)`,
					maxWidth,
					textAlign: align,
					...(chip
						? {
								background: COLORS.chipBg,
								borderRadius: 30,
								padding: '24px 36px',
								boxShadow: '0 8px 20px rgba(58,50,42,0.16)',
						  }
						: {}),
				}}
			>
				<span
					style={{
						fontFamily,
						fontWeight: 700,
						fontSize,
						color: COLORS.ink,
						lineHeight: 1.4,
						whiteSpace: 'pre-line',
					}}
				>
					{parts.map((part, i) => {
						if (part.startsWith('**') && part.endsWith('**')) {
							const word = part.slice(2, -2);
							return (
								<span
									key={i}
									style={{
										background: COLORS.highlight,
										padding: '3px 8px',
										borderRadius: 8,
										boxDecorationBreak: 'clone',
										WebkitBoxDecorationBreak: 'clone',
									}}
								>
									{word}
								</span>
							);
						}
						return <React.Fragment key={i}>{part}</React.Fragment>;
					})}
				</span>
			</div>
		</AbsoluteFill>
	);
};
