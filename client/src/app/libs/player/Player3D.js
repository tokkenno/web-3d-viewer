import {
    AmbientLight,
    Box3,
    LoadingManager,
    PerspectiveCamera,
    PointLight,
    Scene, Vector3,
    WebGLRenderer,
} from 'three';
import EventEmitter from "./EventEmitter";
import TrackballControls from "./TrackballControls";
import OBJLoader from "./OBJLoader";
import MTLLoader from "./MTLLoader";

/**
 * 3D Model player over threejs and webGl
 */
class Player3D {
    /**
     * Create a 3D Model Player inside a DOM object
     * @constructor
     * @param {Element} domElement - Element within which the player will be created
     */
    constructor(domElement) {
        this._eventEmitter = new EventEmitter();

        this.container = domElement;

        this.fps = 25;
        this.aspectRatio = 16 / 9;

        this.width = this.container.offsetWidth;
        let height = this.width / this.aspectRatio;
        this.container.setAttribute("style","display:block; height:" + this.height + "px");
        this.container.style.height = this.height + "px";
        this.height = height;

        this._log("Renderizando en contenedor de", this.width, "x", this.height);

        this.center = { x: this.width / 2, y: this.height / 2 };
        this.mouse = { x: this.center.x, y: this.center.y };

        this.camera = new PerspectiveCamera(45, this.width / this.height, 1, 2500);
        this.camera.position.z = 250;

        this.scene = new Scene();

        let ambientLight = new AmbientLight(0xcccccc, 0.4);
        let pointLight = new PointLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        this.camera.add(pointLight);

        this.control = new TrackballControls(this.camera, this.container);
        this.control.rotateSpeed = 5.0;
        this.control.zoomSpeed = 3.2;
        this.control.panSpeed = 0.8;
        this.control.noZoom = false;
        this.control.noPan = true;
        this.control.staticMoving = false;
        this.control.dynamicDampingFactor = 0.2;

        this.scene.add(this.camera);

        this.renderer = new WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);

        this.container.appendChild(this.renderer.domElement);

        document.addEventListener('mousemove', Player3D.onDocumentMouseMove(this), false);
        window.addEventListener('resize', Player3D.onElementResize(this));

        this._eventEmitter.emit("loaded");
    }

    /**
     * Get the event subscriber
     * @returns {EventSubscriber}
     */
    get events() {
        return this._eventEmitter.subscriber;
    }

    /**
     * Load a OBJ model inside player
     * @param {String} url - Server url from which load OBJ model
     */
    loadObj(url) {
        let context = this;

        let manager = new LoadingManager();
        manager.onProgress = console.log;

        let loader = new OBJLoader(manager);
        loader.load(url, function (object) {
            let box = new Box3().setFromObject(object);
            let objectSize = new Vector3();
            box.getSize(objectSize);
            object.position.y -= objectSize.y / 2;

            context.scene.add(object);
            context.control.reset();
            context._eventEmitter.emit("model-loaded");
        }, manager.onProgress, manager.onError );
    }

    /**
     * Load a OBJ model inside player and applies MTL materials
     * @param {String} objUrl - Server url from which load OBJ model
     * @param {String} mtlUrl - Server url from which load MTL materials
     */
    loadMTL(objUrl, mtlUrl) {
        let context = this;

        let manager = new LoadingManager();
        manager.onProgress = console.log;

        let loader = new MTLLoader();
        loader.load(mtlUrl, function (materials) {
            materials.preload();
            new OBJLoader()
                .setMaterials(materials)
                .load(objUrl, function (object) {
                    let box = new Box3().setFromObject(object);
                    let objectSize = new Vector3();
                    box.getSize(objectSize);
                    object.position.y -= objectSize.y / 2;

                    context.scene.add(object);
                    context.control.reset();
                    context._eventEmitter.emit("model-loaded");
                }, manager.onProgress, manager.onError);
        } );
    }

    /**
     * Event fired when DOM element is resized
     * @param {Player3D} context - Instance of the player
     * @returns {Function}
     */
    static onElementResize(context) { return () => {
        context.width = context.container.offsetWidth;
        let height = context.width / context.aspectRatio;
        context.container.setAttribute("style","display:block; height:" + context.height + "px");
        context.container.style.height = context.height + "px";
        context.height = height;

        context.center = {
            x: context.width / 2,
            y: context.height / 2
        };

        while (context.container.firstChild) {
            context.container.removeChild(context.container.firstChild);
        }
        context.renderer.setSize(context.width, context.height);
        context.container.appendChild(context.renderer.domElement);

        context.camera.aspect = context.width / context.height;
        context.camera.updateProjectionMatrix();
    }}

    /**
     * Event fired when mouse is moved
     * @param {Player3D} context - Instance of the player
     * @returns {Function}
     */
    static onDocumentMouseMove(context) { return (event) => {
        context.mouse = {
            x: (event.clientX - context.center.x) / 2,
            y: (event.clientY - context.center.y) / 2,
        };
    }}

    /**
     * Start the player
     */
    start() { Player3D._runContext(this)(); }

    show() {
        this.container.style.display = 'inherit';
    }

    hide() {
        this.container.style.display = 'none';
    }

    /**
     * Log info about the current player
     * @private
     */
    _log() {
        console.log.apply(this, ["[Player3D]"].concat(Array.from(arguments)));
    }

    /**
     * Internal render logic
     * @param {Player3D} context - Instance of the player
     * @returns {Function}
     * @private
     */
    static _runContext(context) { return () => {
        // Set next frame execution
        requestAnimationFrame(() => { setTimeout(Player3D._runContext(context), 1000 / context.fps); });

        // Render logic
        context.control.update();
        //context.camera.position.x += (context.mouse.x - context.camera.position.x) * .05;
        //context.camera.position.y += (-context.mouse.y - context.camera.position.y) * .05;
        context.camera.lookAt(context.scene.position);
        context.renderer.render(context.scene, context.camera);
    };}
}

export default Player3D;