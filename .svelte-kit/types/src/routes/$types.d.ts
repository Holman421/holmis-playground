import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type PageParentData = EnsureDefined<LayoutData>;
type LayoutRouteId = RouteId | "/" | "/1-svelte-todo" | "/10-three-js-physics" | "/11-three-js-imported-models" | "/12-clamp-calculate" | "/12-three-js-realistic-render" | "/13-three-js-environment-map" | "/14-three-js-shaders-tutorial" | "/15-three-js-shaders-sea" | "/16-three-js-shaders-galaxy" | "/17-three-js-coffe-smoke" | "/18-three-js-shaders-halftone" | "/18-three-js-shaders-hologram" | "/19-three-js-shaders-fireworks" | "/2-flip" | "/20-three-js-shaders-lights" | "/21-three-js-shaders-sea-lights" | "/22-three-js-shaders-moving-particles" | "/23-three-js-shaders-morphing-shapes" | "/24-three-js-shaders-earth" | "/25-three-js-shaders-gpgpu" | "/26-three-js-shaders-wobbly-sphere" | "/27-three-js-shaders-terrain" | "/28-three-js-shaders-sliced-model" | "/29-three-js-shaders-can-brush" | "/3-training-store" | "/30-three-js-shaders-model" | "/31-three-js-shaders-minecraft" | "/32-three-js-postprocesing" | "/33-three-js-tags" | "/34-three-js-random-blocks" | "/35-three-js-interactive-grid" | "/36-three-js-shaders-pixelated" | "/37-three-js-shaders-ring" | "/38-three-js-shaders-gradients" | "/39-three-js-tsl-honeycomb" | "/4-three-js-lights" | "/40-three-js-shaders-gradient-glass" | "/41-three-js-shaders-hover-pixelation" | "/42-three-js-shaders-element-distortion" | "/43-three-js-instanced-mesh" | "/44-raymarching-shapes" | "/45-three-js-text-mobius" | "/46-boxed-image-relevation" | "/47-button-hover" | "/48-three-js-rome-column" | "/49-three-js-portal-gateway" | "/5-three-js-hounted-house" | "/50-inverted-border" | "/51-three-js-postprocesing-scroll" | "/52-three-js-shaders-art" | "/53-three-js-shaders-radar" | "/54-three-js-shaders-studio-chain" | "/55-three-js-glass-text" | "/56-three-js-sponsors" | "/57-three-js-shaders-interactive-particles" | "/58-three-js-shaders-interactive-particles2" | "/59-three-js-shaders-interactive-particles3" | "/6-three-js-particles" | "/60-three-js-shaders-image-reveal" | "/61-three-js-shaders-water-cursor" | "/62-three-js-checkerboard-text" | "/63-avalabs-test" | "/64-three-js-shaders-interactive-particles4" | "/65-three-js-shaders-ribbons" | "/66-three-js-rapier" | "/67-gsap-flip" | "/68-gsap-split-text" | "/68-instanced-lines" | "/69-futuristic-card" | "/7-three-js-galaxy" | "/70-video-scroll" | "/71-tsl-webGPU-portfolio-twisting-column" | "/72-tsl-webGPU-portfolio-disintegrate" | "/73-tsl-webGPU-portfolio-msdf" | "/73-tsl-webGPU-portfolio-msdf-test" | "/74-tsl-webGPU-portfolio-sides" | "/75-tsl-webGPU-portfolio-particle-system" | "/76-tsl-webGPU-portfolio-msdf-library" | "/77-tsl-portfolio-column-grid" | "/8-svg-filters" | "/9-three-js-portfolio" | "/three-js-template" | "/three-js-template/webGPU-tsl" | "/three-js-template/Yuri-template-shader" | null
type LayoutParams = RouteParams & {  }
type LayoutParentData = EnsureDefined<{}>;

export type PageServerData = null;
export type PageData = Expand<PageParentData>;
export type PageProps = { params: RouteParams; data: PageData }
export type LayoutServerData = null;
export type LayoutData = Expand<LayoutParentData>;
export type LayoutProps = { params: LayoutParams; data: LayoutData; children: import("svelte").Snippet }