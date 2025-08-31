import Balancer from 'react-wrap-balancer';
import cn from '@/utils/cn';
import { UNLEASH_STRINGS } from '@/constants';
import JoinColoringPageEmailListForm from '../forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm';
import TypedText from '../TypedText/TypedText';

type IntroProps = {
  className?: string;
};

const Intro = ({ className }: IntroProps) => (
  <div
    className={cn({
      [className as string]: !!className,
    })}
  >
    <h2 className="font-tondo font-bold text-[64px] leading-none md:leading-tight text-[#4B4B4B] mb-8 [white-space:pre-wrap] [word-break:break-word]">
      <Balancer>
        Unleash your child&apos;s
        <br />
        <TypedText className="text-[#FF8A65]" strings={UNLEASH_STRINGS} />{' '}
        <br />
        today
      </Balancer>
    </h2>
    <p className="text-2xl text-[#A6A6A6] mb-8">
      From vibrant colouring pages to imaginative adventures, Chunky Crayon
      transforms creativity into pure joy.
    </p>
    <JoinColoringPageEmailListForm className="max-w-[429px]" />
  </div>
);

export default Intro;
