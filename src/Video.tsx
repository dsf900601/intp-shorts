import {Composition} from 'remotion';
import {Reel} from './Reel';
import {TOTAL_DURATION, FPS, WIDTH, HEIGHT} from './constants';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Reel"
				component={Reel}
				durationInFrames={TOTAL_DURATION}
				fps={FPS}
				width={WIDTH}
				height={HEIGHT}
			/>
		</>
	);
};
