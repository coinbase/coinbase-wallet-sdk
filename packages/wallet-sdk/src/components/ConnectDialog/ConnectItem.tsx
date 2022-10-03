import clsx from "clsx";

import css from "./ConnectItem-css";
import { Theme } from "./types";

type ConnectItemProps = {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick(): void;
  theme: Theme;
};

export function ConnectItem({
  title,
  description,
  icon,
  selected,
  theme,
  onClick,
}: ConnectItemProps) {
  return (
    <>
      <style>{css}</style>
      <div
        onClick={onClick}
        className={clsx("connect-item", theme, { selected })}
      >
        <div>
          <img src={icon} alt={title} />
        </div>
        <div className="connect-item-copy-container">
          <h3 className="connect-item-title">{title}</h3>
          <p className="connect-item-description">{description}</p>
        </div>
      </div>
    </>
  );
}
