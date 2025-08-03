type Project = {
	href: string;
	title: string;
	description: string;
	technologies: string[];
	shared: boolean;
	usedInRealProject?: boolean;
	imgSrc: string;
	date?: Date;
};

const projects: Project[] = [
	{
		href: '/1-svelte-todo',
		title: 'Todo flip',
		description: 'Simple todo app with Svelte and gsap flip animation',
		technologies: ['Svetle', 'GSAP', 'GSAP-Flip', 'Svelte-state'],
		shared: false,
		imgSrc: '/projectThumbnails/todo.png',
		date: new Date('2024-10-09')
	},
	{
		href: '/2-flip',
		title: 'Flip animation',
		description: 'Training with gsap flip animation',
		technologies: ['Svetle', 'GSAP', 'GSAP-Flip', 'Svelte-state'],
		shared: false,
		imgSrc: '/projectThumbnails/flip.png',
		date: new Date('2024-10-09')
	},
	{
		href: '/3-training-store',
		title: 'Svelte stores',
		description: 'Very simple counter with utilization of Svelte stores',
		technologies: ['Svelte', 'Svelte-stores'],
		shared: false,
		imgSrc: '/projectThumbnails/store.png',
		date: new Date('2024-10-16')
	},
	{
		href: '/4-three-js-lights',
		title: 'Three.js Lights',
		description: 'Training with Three.js lights and GUI',
		technologies: ['Three.js', 'Lights', 'Three.js GUI'],
		shared: false,
		imgSrc: '/projectThumbnails/lights-tutorial.png',
		date: new Date('2024-10-21')
	},
	{
		href: '/5-three-js-hounted-house',
		title: 'Three.js Hounted house',
		description: 'Bigger Three.js project with textures and geometries',
		technologies: ['Three.js', 'Textures', 'Geometries'],
		shared: false,
		imgSrc: '/projectThumbnails/hounted-house.png',
		date: new Date('2024-10-29')
	},
	{
		href: '/6-three-js-particles',
		title: 'Three.js Matrix',
		description: 'Simple training of rendering particles in Matrix style',
		technologies: ['Three.js', 'Particles'],
		shared: false,
		imgSrc: '/projectThumbnails/matrix.png',
		date: new Date('2024-10-30')
	},
	{
		href: '/7-three-js-galaxy',
		title: 'Galaxy generator',
		description: 'Scene with thousands of particles forming galaxy, higtly customizable',
		technologies: ['Three.js', 'Particles', 'GUI', 'Trigonometry'],
		shared: true,
		imgSrc: '/projectThumbnails/galaxy.mp4',
		date: new Date('2024-11-06')
	},
	{
		href: '/8-svg-filters',
		title: 'SVG Filters Effects',
		description: 'Experimenting with svg filters',
		technologies: ['SVG Filters', 'GSAP'],
		shared: false,
		imgSrc: '/projectThumbnails/svg.png',
		date: new Date('2024-11-06')
	},
	{
		href: '/9-three-js-portfolio',
		title: 'Three.js Portfolio',
		description: 'Small project with Three.js',
		technologies: ['Three.js', 'GSAP'],
		shared: false,
		imgSrc: '/projectThumbnails/portfolio.png',
		date: new Date('2024-11-09')
	},
	{
		href: '/10-three-js-physics',
		title: 'Three.js Physics',
		description: 'Learning about THREE.js physics',
		technologies: ['Three.js', 'GSAP', 'Cannon.js'],
		shared: false,
		imgSrc: '/projectThumbnails/physics.png',
		date: new Date('2024-11-17')
	},
	{
		href: '/11-three-js-imported-models',
		title: 'Three.js Imported models',
		description: 'Learning about importing models into Three.js',
		technologies: ['Three.js', 'GSAP'],
		shared: false,
		imgSrc: '/projectThumbnails/imported-model.png',
		date: new Date('2024-11-17')
	},
	{
		href: '/12-clamp-calculate',
		title: 'Optimal clamp calculator',
		description: 'Handy tool for calculating optimal clamp',
		technologies: ['JS'],
		shared: false,
		imgSrc: '/projectThumbnails/clamp-calculator.png',
		date: new Date('2024-11-24')
	},
	{
		href: '/12-three-js-realistic-render',
		title: 'Realistic render',
		description: 'Project with focus on rendering realistic materials',
		technologies: ['JS'],
		shared: false,
		imgSrc: '/projectThumbnails/realistic-render.png',
		date: new Date('2024-11-24')
	},
	{
		href: '/13-three-js-environment-map',
		title: 'Environment map',
		description:
			'Learning about interacting with three.js with mouse events and setting up environment maps',
		technologies: ['THREE.js', 'Mouse events'],
		shared: false,
		imgSrc: '/projectThumbnails/environment-map.png',
		date: new Date('2024-11-27')
	},
	{
		href: '/14-three-js-shaders-tutorial',
		title: 'Shaders Basic',
		description: 'First experimentation with GLSL shaders',
		technologies: ['THREE.js', 'Shaders'],
		shared: false,
		imgSrc: '/projectThumbnails/shaders-basic.png',
		date: new Date('2024-12-06')
	},
	{
		href: '/15-three-js-shaders-sea',
		title: 'Sea simulation',
		description: 'Sea with shaders',
		technologies: ['THREE.js', 'Shaders'],
		shared: false,
		imgSrc: '/projectThumbnails/sea-basic.png',
		date: new Date('2024-12-07')
	},
	{
		href: '/16-three-js-shaders-galaxy',
		title: 'Animated Galaxy',
		description: 'Scene with thousands of particles forming galaxy, animated with shaders',
		technologies: ['THREE.js', 'Shaders'],
		shared: true,
		imgSrc: '/projectThumbnails/animated-galaxy.mp4',
		date: new Date('2024-12-14')
	},
	{
		href: '/17-three-js-coffe-smoke',
		title: 'Animated coffe smoke',
		description: 'Static model with animated smoke effect',
		technologies: ['THREE.js', 'Shaders'],
		shared: true,
		imgSrc: '/projectThumbnails/coffe-smoke.mp4',
		date: new Date('2024-12-14')
	},
	{
		href: '/18-three-js-shaders-hologram',
		title: 'Hologram effect',
		description: 'Hologram like effect with occasional glitch',
		technologies: ['THREE.js', 'Shaders'],
		shared: true,
		imgSrc: '/projectThumbnails/hologram.mp4',
		date: new Date('2024-12-21')
	},
	{
		href: '/18-three-js-shaders-halftone',
		title: 'Halftone shading',
		description: 'Shader with halftone shading and custom lights',
		technologies: ['JS'],
		shared: false,
		imgSrc: '/projectThumbnails/halftone.png',
		date: new Date('2024-12-22')
	},
	{
		href: '/19-three-js-shaders-fireworks',
		title: 'Fireworks',
		description: 'Scene with fireworks like effect on each click',
		technologies: ['THREE.js', 'Shaders'],
		shared: false,
		imgSrc: '/projectThumbnails/galaxy.png',
		date: new Date('2024-12-25')
	},
	{
		href: '/20-three-js-shaders-lights',
		title: 'Shaders Lights',
		description: 'Scene with custom lights made in shaders',
		technologies: ['THREE.js', 'Shaders', 'Lights'],
		shared: false,
		imgSrc: '/projectThumbnails/lights-shaders.png',
		date: new Date('2025-01-02')
	},
	{
		href: '/21-three-js-shaders-sea-lights',
		title: 'Sea with Lights',
		description: 'Animated sea like surface with lights and shadows',
		technologies: ['THREE.js', 'Shaders', 'Lights'],
		shared: true,
		imgSrc: '/projectThumbnails/sea-shadows.mp4',
		date: new Date('2025-01-04')
	},
	{
		href: '/22-three-js-shaders-moving-particles',
		title: 'Particles canvas',
		description:
			'Scene with picture divided into particles that gets displacement with mouse movement',
		technologies: ['THREE.js', 'Shaders', 'Points', 'Canvas', 'Raycaster'],
		shared: true,
		imgSrc: '/projectThumbnails/displacement-particles.mp4',
		date: new Date('2025-01-05')
	},
	{
		href: '/23-three-js-shaders-morphing-shapes',
		title: '3D Morhing shapes',
		description:
			'Scene with 3D models represented with a lot of points morphing to each other shapes',
		technologies: ['THREE.js', 'Shaders', 'Points'],
		shared: true,
		imgSrc: '/projectThumbnails/morphing.mp4',
		date: new Date('2025-01-05')
	},
	{
		href: '/24-three-js-shaders-earth',
		title: 'Earth globe',
		description: 'Scene with 3D earth model and atmosphere effect made with shaders',
		technologies: ['THREE.js', 'Shaders', 'Texture'],
		shared: false,
		imgSrc: '/projectThumbnails/earth-globe.png',
		date: new Date('2025-01-14')
	},
	{
		href: '/25-three-js-shaders-gpgpu',
		title: 'GPGPU Technique',
		description: 'Scene with ship model transitioning to particles system with GPGPU technique',
		technologies: ['THREE.js', 'Shaders', 'GPGPU'],
		shared: true,
		imgSrc: '/projectThumbnails/gpgpu-ship.mp4',
		date: new Date('2025-01-17')
	},
	{
		href: '/26-three-js-shaders-wobbly-sphere',
		title: 'Virus project',
		description: 'Virus cards with 3D models of the molecules with various surface disturption',
		technologies: ['THREE.js', 'Shaders', 'CustomShaderMaterial'],
		shared: true,
		imgSrc: '/projectThumbnails/virus.mp4',
		date: new Date('2025-01-26')
	},
	{
		href: '/27-three-js-shaders-terrain',
		title: 'Procedural Terrain',
		description: 'Procedurally generated terrain with shaders',
		technologies: ['THREE.js', 'Shaders', 'CustomShaderMaterial'],
		shared: true,
		imgSrc: '/projectThumbnails/procedural-terrain.mp4',
		date: new Date('2025-01-29')
	},
	{
		href: '/28-three-js-shaders-sliced-model',
		title: 'Sliced model',
		description: 'Scene with 3d model with customizable slice area',
		technologies: ['THREE.js', 'Shaders', 'CustomShaderMaterial'],
		shared: false,
		imgSrc: '/projectThumbnails/sliced-model.png',
		date: new Date('2025-01-29')
	},
	{
		href: '/29-three-js-shaders-can-brush',
		title: 'Can brush effect',
		description: 'Mouse spray can brush effect',
		technologies: ['THREE.js', 'Shaders'],
		shared: true,
		imgSrc: '/projectThumbnails/can-brush.mp4',
		date: new Date('2025-02-08')
	},
	{
		href: '/30-three-js-shaders-model',
		title: 'Model deformation',
		description: 'Scene with 3D model with deformation effect',
		technologies: ['THREE.js', 'Shaders', 'Postprocessing'],
		shared: false,
		imgSrc: '/projectThumbnails/model-deformation.png',
		date: new Date('2025-02-10')
	},
	{
		href: '/31-three-js-shaders-minecraft',
		title: 'Minecraft terrain',
		description: 'Bigger project with minecraft like procedurally generated terrain, animated',
		technologies: ['THREE.js', 'Shaders'],
		shared: true,
		imgSrc: '/projectThumbnails/minecraft.mp4',
		date: new Date('2025-02-19')
	},
	{
		href: '/32-three-js-postprocesing',
		title: 'Postprocessing effect',
		description: 'Various post procesing effects on 3D models together with html tags',
		technologies: ['THREE.js', 'Shaders', 'Postprocessing'],
		shared: true,
		imgSrc: '/projectThumbnails/postprocessing-helmet.png',
		date: new Date('2025-02-19')
	},
	{
		href: '/33-three-js-tags',
		title: 'Tags with Three.js',
		description: 'Applying descriptive html tags to 3D scenes',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/tags-sword.mp4',
		date: new Date('2025-02-23')
	},
	{
		href: '/34-three-js-random-blocks',
		title: 'Block sphere',
		description:
			'Scene with random moving cubes with cool animation and transition to normal 2D page layout',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/random-blocks.mp4',
		date: new Date('2025-02-28')
	},
	{
		href: '/35-three-js-interactive-grid',
		title: 'Interactive Grid',
		description: 'Background scene with interactive grid of colorfull cubes, has 2 modes',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/interactive-grid.mp4',
		date: new Date('2025-03-07')
	},
	{
		href: '/36-three-js-shaders-pixelated',
		title: 'Pixelation effect',
		description: 'Simple Image load pixelated effect',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/pixelation-effect.mp4',
		date: new Date('2025-03-07')
	},
	{
		href: '/37-three-js-shaders-ring',
		title: 'Ring text animation',
		description:
			'Scene with ring shape with noice generated alumination distortion effect, and text transition animation',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/ring-shader.mp4',
		date: new Date('2025-03-15')
	},
	{
		href: '/38-three-js-shaders-gradients',
		title: 'Lava lamp gradient',
		description: 'Cards with fragment and vertex Lava lamp like gradient shaders',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/lava-lamp.mp4',
		date: new Date('2025-03-18')
	},
	{
		href: '/39-three-js-tsl-honeycomb',
		title: 'Honeycomb transition',
		description: 'Scene with honeycomb like transition effect',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/honeycomb-transition.mp4',
		date: new Date('2025-03-22')
	},
	{
		href: '/40-three-js-shaders-gradient-glass',
		title: 'Gradient glass effect',
		description: 'Scene with smooth gradient background and glass effect round shape',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/gradient-glass.mp4',
		date: new Date('2025-03-29')
	},
	{
		href: '/41-three-js-shaders-hover-pixelation',
		title: 'Onhover pixelation',
		description: 'Image pixelation distortion onhover effect',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/pixelation-onhover.mp4',
		date: new Date('2025-04-02')
	},
	{
		href: '/42-three-js-shaders-element-distortion',
		title: 'Element distortion',
		description:
			'Effect where regular images are distorted to the point they act as a abstract background',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/element-distortion.mp4',
		date: new Date('2025-04-02')
	},
	{
		href: '/43-three-js-instanced-mesh',
		title: 'Instanced Mesh',
		description:
			'Scene with many animated cubes with instanced mesh technique, with custom shader material',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/instanced-mesh.mp4',
		date: new Date('2025-04-09')
	},
	{
		href: '/44-raymarching-shapes',
		title: 'Raymarching shapes',
		description: 'Simple 2D html animated shapes that merge into themselfs',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/raymarching-shapes.mp4',
		date: new Date('2025-04-16')
	},
	{
		href: '/45-three-js-text-mobius',
		title: 'Mobius text',
		description: 'Text with mobius strip effect',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/text-mobius.png',
		date: new Date('2025-04-16')
	},
	{
		href: '/46-boxed-image-relevation',
		title: 'Grid image relevation',
		description: 'Cool image reveal effect',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/boxed-image-relevation.mp4',
		date: new Date('2025-04-23')
	},
	{
		href: '/47-button-hover',
		title: 'Button hover effect',
		description: 'Cool button hover effect',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/button-hover.mp4',
		date: new Date('2025-04-23')
	},
	{
		href: '/48-three-js-rome-column',
		title: 'Rome column 3D scene',
		description: 'Rotating scene around Rome column',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/roman-column.mp4',
		date: new Date('2025-05-02')
	},
	{
		href: '/49-three-js-portal-gateway',
		title: 'Portal gateway',
		description: 'Scene with detailed gateway and animated portal effect',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/portal-gateway.mp4',
		date: new Date('2025-05-03')
	},
	{
		href: '/50-inverted-border',
		title: 'Css inverted border',
		description: 'Shapes with inverted borders using svg masks',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/inverted-border.png',
		date: new Date('2025-05-11')
	},
	{
		href: '/51-three-js-postprocesing-scroll',
		title: 'Warped gallery',
		description: 'Photo gallery with warping effect on scroll',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/galery-warp.mp4',
		date: new Date('2025-05-11')
	},
	{
		href: '/52-three-js-shaders-art',
		title: 'Noise gradients',
		description: 'Collection of noise gradient shaders',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/noice-gradient.mp4',
		date: new Date('2025-05-18')
	},
	{
		href: '/53-three-js-shaders-radar',
		title: 'Submarine Radar',
		description: 'Advanced radar simulation demo with shaders',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/radar.mp4',
		date: new Date('2025-05-25')
	},
	{
		href: '/54-three-js-shaders-studio-chain',
		title: 'Chain Studio',
		description: 'Pixelated, animated effect used for background and mouse cursor',
		technologies: ['THREE.js'],
		shared: true,
		usedInRealProject: true,
		imgSrc: '/projectThumbnails/studio-chain.mp4',
		date: new Date('2025-05-29')
	},
	{
		href: '/55-three-js-glass-text',
		title: 'WM Glass text',
		description: 'Torus with glass material and perlin noise metalness animation with text inside',
		technologies: ['THREE.js'],
		shared: true,
		usedInRealProject: false,
		imgSrc: '/projectThumbnails/glass-text.mp4',
		date: new Date('2025-06-01')
	},
	{
		href: '/56-three-js-sponsors',
		title: 'Sponsor idea',
		description: '',
		technologies: ['THREE.js'],
		shared: false,
		usedInRealProject: false,
		imgSrc: '/projectThumbnails/glass-text.png',
		date: new Date('2025-06-01')
	},
	{
		href: '/57-three-js-shaders-interactive-particles',
		title: 'Interactive Particles',
		description: 'Non responsive particles system scene using GPGPU technique',
		technologies: ['THREE.js'],
		shared: true,
		usedInRealProject: false,
		imgSrc: '/projectThumbnails/interactive-particles-1.mp4',
		date: new Date('2025-06-08')
	},
	{
		href: '/58-three-js-shaders-interactive-particles2',
		title: 'Interactive Particles 2',
		description:
			'Interactive particles system scene using GPGPU technique, with hover and click effect',
		technologies: ['THREE.js'],
		shared: true,
		usedInRealProject: false,
		imgSrc: '/projectThumbnails/interactive-particles-2.mp4',
		date: new Date('2025-06-08')
	},
	{
		href: '/59-three-js-shaders-interactive-particles3',
		title: 'Interactive Particles 3',
		description: '3D particles system scene using GPGPU technique',
		technologies: ['THREE.js'],
		shared: true,
		usedInRealProject: false,
		imgSrc: '/projectThumbnails/interactive-particles-3.mp4',
		date: new Date('2025-06-15')
	},
	{
		href: '/60-three-js-shaders-image-reveal',
		title: 'Image reveal',
		description: 'Randomized shader image reveal effect',
		technologies: ['THREE.js'],
		shared: true,
		usedInRealProject: false,
		imgSrc: '/projectThumbnails/image-reveal.mp4',
		date: new Date('2025-06-15')
	},
	{
		href: '/61-three-js-shaders-water-cursor',
		title: 'Water trail cursor effect',
		description: 'On hover water trail cursor effect',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/water-cursor.mp4',
		date: new Date('2025-06-19')
	},
	{
		href: '/62-three-js-checkerboard-text',
		title: 'Checkerboard text reveal',
		description: 'Pixelated text reveal effect',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/checkerboard-text.mp4',
		date: new Date('2025-06-19')
	},
	{
		href: '/63-avalabs-test',
		title: 'Avalabs testing',
		description: 'Various testing of effects and shaders for Avalabs project',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/avalabs.mp4',
		date: new Date('2025-06-25')
	},
	{
		href: '/64-three-js-shaders-interactive-particles4',
		title: 'Interactive particles 4',
		description: '2D particles system scene using GPGPU technique',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/particles-4.mp4',
		date: new Date('2025-06-28')
	},
	{
		href: '/65-three-js-shaders-ribbons',
		title: 'Ribbons Plane',
		description: 'Plane seperated into ribbons with animated shader effect',
		technologies: ['THREE.js'],
		shared: false,
		imgSrc: '/projectThumbnails/particles-4.mp4',
		date: new Date('2025-06-28')
	},
	{
		href: '/66-three-js-rapier',
		title: 'Rapier Experimentation',
		description: 'Testing rapier physics engine with Three.js',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/rapier.mp4',
		date: new Date('2025-06-30')
	},
	{
		href: '/67-gsap-flip',
		title: 'Tile highlight',
		description: 'Tile highlight animation with smoothly transforming shape',
		technologies: ['THREE.js'],
		shared: true,
		imgSrc: '/projectThumbnails/gsap-flip.mp4',
		date: new Date('2025-07-01')
	},
	{
		href: '/68-gsap-split-text',
		title: 'Split text hover',
		description: 'Team section with hover effect on each team member',
		technologies: ['GSAP'],
		shared: false,
		imgSrc: '/projectThumbnails/gsap-flip.mp4',
		date: new Date('2025-07-01')
	},
	{
		href: '/69-futuristic-card',
		title: 'Futuristic card',
		description: 'Simple css card with futuristic hover effect',
		technologies: ['GSAP'],
		shared: true,
		imgSrc: '/projectThumbnails/futuristic-card.mp4',
		date: new Date('2025-07-02')
	},
	{
		href: '/70-video-scroll',
		title: 'Video on scroll',
		description: 'Video that plays on scroll',
		technologies: ['GSAP'],
		shared: true,
		imgSrc: '/projectThumbnails/video-scroll.mp4',
		date: new Date('2025-07-02')
	},
	{
		href: '/71-tsl-webGPU-portfolio-twisting-column',
		title: 'Twisting column',
		description: 'Portfolio training - 1, twisting column with TSL and WebGPU',
		technologies: ['webGPU'],
		shared: true,
		imgSrc: '/projectThumbnails/column.mp4',
		date: new Date('2025-07-25')
	},
	{
		href: '/72-tsl-webGPU-portfolio-disintegrate',
		title: 'Disintegrate',
		description: 'Portfolio training - 2, disintegrate effect with TSL and WebGPU',
		technologies: ['webGPU'],
		shared: true,
		imgSrc: '/projectThumbnails/disintegrate.mp4',
		date: new Date('2025-08-1')
	},
	{
		href: '/73-tsl-webGPU-portfolio-msdf',
		title: 'MSDF Text',
		description: 'Portfolio training - 2, MSDF text with TSL and WebGPU',
		technologies: ['webGPU'],
		shared: false,
		imgSrc: '/projectThumbnails/video-scroll.mp4',
		date: new Date('2025-08-1')
	},
	{
		href: '/74-tsl-webGPU-portfolio-sides',
		title: 'Instanced mesh',
		description: 'Portfolio training - 3, instanced mesh with worldPosition shader',
		technologies: ['webGPU'],
		shared: true,
		imgSrc: '/projectThumbnails/sides.mp4',
		date: new Date('2025-08-1')
	}
];

const reversedProjects = [...projects].reverse();

export { reversedProjects as projects };