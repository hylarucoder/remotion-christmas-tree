import { Composition, Folder } from "remotion";
import "./tailwind.css";
import React from "react";
import { ChristmasTreeScene } from "./three-3d-christmas-tree/Scene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChristmasTreeScene"
        component={ChristmasTreeScene}
        durationInFrames={15.5 * 60}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
