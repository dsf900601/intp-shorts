import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {KenBurns} from './components/KenBurns';
import {Caption} from './components/Caption';
import {SceneFade} from './components/SceneFade';
import {IMAGES, SCENE, STARTS} from './constants';
import {
	SCENE1_KEYFRAMES,
	SCENE2_KEYFRAMES,
	SCENE34_KEYFRAMES,
	MONTAGE_KEYFRAMES,
	MONTAGE_SHOT_IMAGE,
	MONTAGE_SHOT_DURATIONS,
	MONTAGE_BRIDGE_KEYFRAMES,
	INJURY_KEYFRAMES,
	CONCLUSION_KEYFRAMES,
} from './shots';

// Fades are only used at real page changes (page1->2->3->4). Everything else
// - including montage cuts, and the injury->conclusion beat change that stays
// on page4 - is a hard cut, per the "hard cut by default" brief.
export const Reel: React.FC = () => {
	return (
		<AbsoluteFill>
			{/* SCENE 1 — page1: "나는 좋아하는 걸 깊게 파는 사람이 아니었다." */}
			<Sequence from={STARTS.s1} durationInFrames={SCENE.s1}>
				<SceneFade durationInFrames={SCENE.s1} fadeIn={false} fadeOut>
					<KenBurns src={IMAGES.page1} keyframes={SCENE1_KEYFRAMES} />
				</SceneFade>
			</Sequence>

			{/* SCENE 2 — page2: why basketball started */}
			<Sequence from={STARTS.s2} durationInFrames={SCENE.s2}>
				<SceneFade durationInFrames={SCENE.s2} fadeIn fadeOut>
					<KenBurns src={IMAGES.page2} keyframes={SCENE2_KEYFRAMES} />
				</SceneFade>
			</Sequence>

			{/* SCENE 3+4 — page3, one continuous camera move: the pass, the "why?",
			    then the analysis questions piling up. No internal cut. */}
			<Sequence from={STARTS.s34} durationInFrames={SCENE.s34}>
				<SceneFade durationInFrames={SCENE.s34} fadeIn fadeOut={false}>
					<KenBurns src={IMAGES.page3} keyframes={SCENE34_KEYFRAMES} />
					<Caption
						text={'그런데 어느 날,\n이상하게 **패스가** 자꾸 내 쪽으로 왔다.'}
						from={0}
						durationInFrames={58}
						fontSize={48}
						vAlign="bottom"
						edgePadding={130}
					/>
					<Caption text="**왜?**" from={92} durationInFrames={58} fontSize={80} vAlign="top" edgePadding={110} />
					<Caption text="내가 어떻게 움직였지?" from={160} durationInFrames={45} fontSize={44} />
					<Caption text="수비는 왜 따라왔지?" from={210} durationInFrames={45} fontSize={44} />
					<Caption text="빈자리는 언제 생기지?" from={265} durationInFrames={45} fontSize={44} />
					<Caption text="패스가 오는 원리는?" from={315} durationInFrames={45} fontSize={44} />
				</SceneFade>
			</Sequence>

			{/* MONTAGE — fast hard cuts across page3 / page4, curiosity snowballing */}
			<Sequence from={STARTS.montage} durationInFrames={SCENE.montage}>
				<Montage />
				<Caption text="호기심이 생기니까 **분석이** 시작됐다." from={30} durationInFrames={80} fontSize={46} />
			</Sequence>

			{/* INJURY — still digging in even after getting hurt (page4) */}
			<Sequence from={STARTS.injury} durationInFrames={SCENE.injury}>
				<KenBurns src={IMAGES.page4} keyframes={INJURY_KEYFRAMES} />
			</Sequence>

			{/* CONCLUSION — the thesis (page4, hard cut in, holds to the end) */}
			<Sequence from={STARTS.conclusion} durationInFrames={SCENE.conclusion}>
				<KenBurns src={IMAGES.page4} keyframes={CONCLUSION_KEYFRAMES} />
				<Caption
					text="인치디 관찰일지 #C01"
					from={182}
					durationInFrames={28}
					fontSize={30}
					chip={false}
					vAlign="bottom"
					edgePadding={70}
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

const Montage: React.FC = () => {
	let acc = 0;
	const shots = MONTAGE_SHOT_DURATIONS.map((dur, i) => {
		const shot = {
			from: acc,
			duration: dur,
			image: MONTAGE_SHOT_IMAGE[i],
			keyframes: MONTAGE_KEYFRAMES[i],
		};
		acc += dur;
		return shot;
	});
	const bridgeFrom = acc;
	const bridgeDuration = SCENE.montage - acc;

	return (
		<>
			{shots.map((shot, i) => (
				<Sequence key={i} from={shot.from} durationInFrames={shot.duration}>
					<KenBurns src={IMAGES[shot.image]} keyframes={shot.keyframes} />
				</Sequence>
			))}
			<Sequence from={bridgeFrom} durationInFrames={bridgeDuration}>
				<KenBurns src={IMAGES.page4} keyframes={MONTAGE_BRIDGE_KEYFRAMES} />
			</Sequence>
		</>
	);
};
