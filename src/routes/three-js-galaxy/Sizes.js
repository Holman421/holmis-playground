import EventEmmitter from './EventEmitter';

export default class Sizes extends EventEmmitter {
	constructor() {
		super();

		this.width = window.innerWidth;
		this.height = window.innerHeight - 56;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		// Resize event
		window.addEventListener('resize', () => {
			this.width = window.innerWidth;
			this.height = window.innerHeight - 56;
			this.pixelRatio = Math.min(window.devicePixelRatio, 2);

			this.trigger('resize');
		});
	}
}
