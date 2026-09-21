import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS} from '../constants';

// Very short fade-to-paper between scenes, so cuts feel soft rather than jarring.
// The very first scene must never fade in from blank (the opening frame is
// shown immediately), and the very last scene must never fade out to blank.
export const SceneFade: React.FC<{
	durationInFrames: number;
	fadeFrames?: number;
	fadeIn?: boolean;
	fadeOut?: boolean;
	children: React.ReactNode;
}> = ({durationInFrames, fadeFrames = 5, fadeIn = true, fadeOut = true, children}) => {
	const frame = useCurrentFrame();
	const opacityIn = fadeIn
		? interpolate(frame, [0, fadeFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
		: 1;
	const opacityOut = fadeOut
		? interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
		  })
		: 1;
	const opacity = Math.min(opacityIn, opacityOut);
	return (
		<AbsoluteFill style={{backgroundColor: COLORS.cream}}>
			<AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};
