import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {IMAGE_SIZE, COLORS} from '../constants';

export type Keyframe = {
	frame: number;
	cx: number; // 0-1 focus point x, normalized to source image
	cy: number; // 0-1 focus point y, normalized to source image
	zoom: number; // >=1, multiplier over "fit height" base scale
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const KenBurns: React.FC<{
	src: string;
	keyframes: Keyframe[];
}> = ({src, keyframes}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();

	const inputRange = keyframes.map((k) => k.frame);
	const easing = Easing.inOut(Easing.ease);

	const cx = interpolate(frame, inputRange, keyframes.map((k) => k.cx), {
		easing,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const cy = interpolate(frame, inputRange, keyframes.map((k) => k.cy), {
		easing,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const zoom = interpolate(frame, inputRange, keyframes.map((k) => k.zoom), {
		easing,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const baseScale = height / IMAGE_SIZE;
	const scale = baseScale * zoom;

	const imgW = IMAGE_SIZE * scale;
	const imgH = IMAGE_SIZE * scale;

	const rawX = width / 2 - cx * imgW;
	const rawY = height / 2 - cy * imgH;

	const minX = Math.min(0, width - imgW);
	const minY = Math.min(0, height - imgH);

	const translateX = clamp(rawX, minX, 0);
	const translateY = clamp(rawY, minY, 0);

	return (
		<div
			style={{
				width,
				height,
				overflow: 'hidden',
				position: 'relative',
				backgroundColor: COLORS.cream,
			}}
		>
			<Img
				src={staticFile(src)}
				style={{
					position: 'absolute',
					width: imgW,
					height: imgH,
					left: translateX,
					top: translateY,
					maxWidth: 'none',
				}}
			/>
		</div>
	);
};
