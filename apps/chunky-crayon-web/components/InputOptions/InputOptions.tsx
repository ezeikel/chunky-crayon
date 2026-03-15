import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faKeyboard,
  faMicrophone,
  faCamera,
  faMagicWandSparkles,
} from '@fortawesome/pro-regular-svg-icons';

const INPUT_OPTIONS = [
  {
    label: 'Text',
    value: 'text',
    icon: <FontAwesomeIcon icon={faKeyboard} className="text-white text-6xl" />,
  },
  {
    label: 'Voice',
    value: 'voice',
    icon: (
      <FontAwesomeIcon icon={faMicrophone} className="text-white text-6xl" />
    ),
  },
  {
    label: 'Image',
    value: 'image',
    icon: <FontAwesomeIcon icon={faCamera} className="text-white text-6xl" />,
  },
  {
    label: 'Magic',
    value: 'magic',
    icon: (
      <FontAwesomeIcon
        icon={faMagicWandSparkles}
        className="text-white text-6xl"
      />
    ),
  },
];

const InputOptions = () => (
  <div className="flex gap-8 justify-center items-center flex-wrap">
    {INPUT_OPTIONS.map((inputOption) => (
      <button
        key={inputOption.value}
        className="flex items-center justify-center p-8 rounded-[68px] bg-teal-800 size-[140px]"
        type="button"
      >
        {inputOption.icon}
      </button>
    ))}
  </div>
);

export default InputOptions;
