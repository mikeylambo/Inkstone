// The Inkstone simulation stays JavaScript behind the ThreeAdapter boundary.
// These ambient declarations let the strict, typed shell glue import the JS
// sim graph without pulling three/tone type packages into the consumer check.
declare module "three";
declare module "tone";
declare module "*.css";
declare const __APP_VERSION__: string;
