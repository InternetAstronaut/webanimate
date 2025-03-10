/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

Wick.View.Project = class extends Wick.View {
    static get DEFAULT_CANVAS_BG_COLOR() {
        return 'rgb(187, 187, 187)';
    }

    static get VALID_FIT_MODES() {
        return ['center', 'fill'];
    }

    static get VALID_RENDER_MODES() {
        return ['svg', 'webgl'];
    }

    static get ORIGIN_CROSSHAIR_COLOR() {
        return '#CCCCCC';
    }

    static get ORIGIN_CROSSHAIR_SIZE() {
        return 100;
    }

    static get ORIGIN_CROSSHAIR_THICKNESS() {
        return 1;
    }

    static get ZOOM_MIN() {
        return 0.1;
    }

    static get ZOOM_MAX() {
        return 10.0;
    }

    static get PAN_LIMIT() {
        return 10000;
    }

    /*
     * Create a new Project View.
     */
    constructor(model) {
        super(model);

        this._fitMode = null;
        this.fitMode = 'center';

        this._canvasContainer = null;
        this._canvasBGColor = null;

        this._svgCanvas = null;
        this._svgBackgroundLayer = null;
        this._svgBordersLayer = null;
        this._svgGUILayer = null;

        this._pan = { x: 0, y: 0 };
        this._zoom = 1;
    }

    /*
     * Determines the way the project will scale itself based on its container.
     * 'center' will keep the project at its original resolution, and center it inside its container.
     * 'fill' will stretch the project to fit the container (while maintaining its original aspect ratio).
     *
     * Note: For these changes to be reflected after setting fitMode, you must call Project.View.resize().
     */
    set fitMode(fitMode) {
        if (Wick.View.Project.VALID_FIT_MODES.indexOf(fitMode) === -1) {
            console.error("Invalid fitMode: " + fitMode);
            console.error("Supported fitModes: " + Wick.View.Project.VALID_FIT_MODES.join(','));
        } else {
            this._fitMode = fitMode;
        }
    }

    get fitMode() {
        return this._fitMode;
    }

    /**
     * The current canvas being rendered to.
     */
    get canvas() {
        return this._svgCanvas;
    }

    /**
     * Get the current width/height of the canvas.
     */
    get canvasDimensions () {
        return {
            width: this._svgCanvas.offsetWidth,
            height: this._svgCanvas.offsetHeight,
        };
    }

    /**
     * The zoom amount. 1 = 100% zoom
     */
    get zoom() {
        return this._zoom;
    }

    set zoom(zoom) {
        this._zoom = zoom;
    }

    /**
     * The amount to pan the view. (0,0) is the center.
     */
    get pan() {
        var pan = {
            x: -this.paper.view.center.x,
            y: -this.paper.view.center.y,
        };
        if (this.model.focus.isRoot) {
            pan.x += this.model.width / 2;
            pan.y += this.model.height / 2;
        }
        return pan;
    }

    set pan(pan) {
        this._pan = {
            x: pan.x,
            y: pan.y,
        };
        if (this.model.focus.isRoot) {
            this._pan.x -= this.model.width / 2;
            this._pan.y -= this.model.height / 2;
        }
    }

    /*
     * The element to insert the project's canvas into.
     */
    set canvasContainer(canvasContainer) {
        this._canvasContainer = canvasContainer;
    }

    get canvasContainer() {
        return this._canvasContainer;
    }

    /**
     * The background color of the canvas.
     */
    set canvasBGColor(canvasBGColor) {
        this._canvasBGColor = canvasBGColor;
    }

    get canvasBGColor() {
        return this._canvasBGColor;
    }

    /**
     * Render the view.
     */
    render() {
        this.zoom = this.model.zoom;
        this.pan = this.model.pan;

        this._buildSVGCanvas();
        this._displayCanvasInContainer(this._svgCanvas);
        this.resize();
        this._renderSVGCanvas();
        this._updateCanvasContainerBGColor();
    }

    /**
     * Render all frames in the project to make sure everything is loaded correctly.
     */
    prerender() {
        this.render();
        this.model.getAllFrames().forEach(frame => {
            frame.view.render();
        });
    }

    /*
     * Resize the canvas to fit it's container div.
     * Resize is called automatically before each render, but you must call it if you manually change the size of the container div.
     */
    resize() {
        if (!this.canvasContainer) return;

        var containerWidth = this.canvasContainer.offsetWidth;
        var containerHeight = this.canvasContainer.offsetHeight;

        this.paper.view.viewSize.width = containerWidth;
        this.paper.view.viewSize.height = containerHeight;
    }

    /**
     * Write the SVG data in the view to the project.
     */
    applyChanges() {
        this.model.selection.view.applyChanges();

        this.model.focus.timeline.activeFrames.forEach(frame => {
            frame.view.applyChanges();
        });
    }

    /**
     * Returns how much the zoom level must be to optimally fit the canvas inside a div.
     * @type {Number}
     */
    calculateFitZoom () {
        var w = 0;
        var h = 0;

        w = this.paper.view.viewSize.width;
        h = this.paper.view.viewSize.height;

        var wr = w / this.model.width;
        var hr = h / this.model.height;

        return Math.min(wr, hr);
    }


    /**
     *  This is a hacky way to create scroll-to-zoom functionality
     *  (Using https://github.com/jquery/jquery-mousewheel for cross-browser mousewheel event)
     * @param {*} event - jquery mousewheel event.
     */
    scrollToZoom (event) {
        if (!this.model.isPublished) {
            var d = event.deltaY * event.deltaFactor * 0.001;
            this.paper.view.zoom = Math.max(0.1, this.paper.view.zoom + d);
            this._applyZoomAndPanChangesFromPaper();
        }
    }

    _setupTools () {
        // Attach scroll to zoom event.
        $(this._svgCanvas).on('mousewheel', e => {
            e.preventDefault();
            this.scrollToZoom(e);
        });

        // Connect all Wick Tools into the paper.js project
        for (var toolName in this.model.tools) {
            var tool = this.model.tools[toolName];
            tool.project = this.model;
            tool.on('canvasModified', (e, actionName) => {
                this.applyChanges();
                this.fireEvent('canvasModified', e, actionName);
            });
            tool.on('canvasViewTransformed', (e) => {
                this._applyZoomAndPanChangesFromPaper();
                this.fireEvent('canvasModified', e, `viewTransform-${toolName}`);
            });
            tool.on('eyedropperPickedColor', (e) => {
                this.fireEvent('eyedropperPickedColor', e);
            });
        }

        this.model.tools.none.activate();
    }

    _displayCanvasInContainer(canvas) {
        if (!this.canvasContainer) return;

        if (canvas !== this.canvasContainer.children[0]) {
            if (this.canvasContainer.children.length === 0) {
                this.canvasContainer.appendChild(canvas);
            } else {
                this.canvasContainer.innerHTML = '';
                this.canvasContainer.appendChild(canvas);
            }
            this.resize();
        }
    }

    _updateCanvasContainerBGColor() {
        if (this.model.focus === this.model.root) {
            // We're in the root timeline, use the color given to us from the user (or use a default)
            this.canvas.style.backgroundColor = this.canvasBGColor || Wick.View.Project.DEFAULT_CANVAS_BG_COLOR;
        } else {
            // We're inside a clip
            if (this.model.toolSettings.getSetting('outsideClipShowBorder')) {
                // Use the same color as the root
                this.canvas.style.backgroundColor = this.canvasBGColor || Wick.View.Project.DEFAULT_CANVAS_BG_COLOR;
            } else {
                // Use the project background color as the container background color
                this.canvas.style.backgroundColor = this.model.backgroundColor.hex;
            }
        }
    }

    _buildSVGCanvas() {
        if (this._svgCanvas) return;

        this._svgCanvas = document.createElement('canvas');
        this._svgCanvas.style.width = '100%';
        this._svgCanvas.style.height = '100%';
        this._svgCanvas.tabIndex = 0;
        this._svgCanvas.onclick = () => { this._svgCanvas.focus(); };
        this.paper.setup(this._svgCanvas);

        this._svgBackgroundLayer = new paper.Layer();
        this._svgBackgroundLayer.name = 'wick_project_bg';
        this._svgBackgroundLayer.remove();

        this._svgOuterLayer = new paper.Layer();
        this._svgOuterLayer.name = 'wick_project_outer';
        this._svgOuterLayer.applyMatrix = false;
        this._svgOuterLayer.remove();

        this._svgBordersLayer = new paper.Layer();
        this._svgBordersLayer.name = 'wick_project_borders';
        this._svgBordersLayer.remove();

        this._svgGUILayer = new paper.Layer();
        this._svgGUILayer.locked = true;
        this._svgGUILayer.name = 'wick_project_gui';
        this._svgGUILayer.remove();

        this.paper.project.clear();
    }

    _renderSVGCanvas() {
        this.paper.project.clear();

        // Lazily setup tools
        if (!this._toolsSetup) {
            this._toolsSetup = true;
            this._setupTools();
        }

        if (this.model.project.playing) {
            // Enable interact tool if the project is running
            this.model.tools.interact.activate();
        } else if (!this.model.canDraw && this.model.activeTool.isDrawingTool) {
            // Disable drawing tools if there's no frame to edit
            this.model.tools.none.activate();
        } else {
            this.model.activeTool.activate();
        }

        // Update zoom and pan
        if (this._fitMode === 'center') {
            this.paper.view.zoom = this.model.zoom;
        } else if (this._fitMode === 'fill') {
            // Fill mode: Try to fit the wick project's canvas inside the container canvas by
            // scaling it as much as possible without changing the project's original aspect ratio
            this.paper.view.zoom = this.model.zoom * this.calculateFitZoom();
        }

        var pan = this._pan;
        this.paper.view.center = new paper.Point(-pan.x, -pan.y);
        this.paper.view.rotation = this.model.rotation;

        // Add transformed objects layer before background
        this._svgOuterLayer.removeChildren();
        this._svgOuterLayer.matrix.set(new paper.Matrix());
        this._svgOuterLayer.locked = true;
        this._svgOuterLayer.opacity = 1;
        this.paper.project.addLayer(this._svgOuterLayer);

        // Generate background layer
        this._svgBackgroundLayer.removeChildren();
        this._svgBackgroundLayer.locked = true;
        this.paper.project.addLayer(this._svgBackgroundLayer);

        if (this.model.focus.isRoot) {
            // We're in the root timeline, render the canvas normally
            var stage = this._generateSVGCanvasStage();
            this._svgBackgroundLayer.addChild(stage);
        } else {
            // We're inside a clip, don't render the canvas BG directly, instead render a crosshair at (0,0)
            var originCrosshair = this._generateSVGOriginCrosshair();
            this._svgBackgroundLayer.addChild(originCrosshair);

            if (this.model.toolSettings.getSetting('outsideClipStyle') !== 'none') {
                if (this.model.toolSettings.getSetting('outsideClipShowBorder')) {
                    this._svgOuterLayer.addChild(this._generateSVGCanvasStage());
                }

                var rootTimeline = this.model.root.timeline;

                var objectsGroup = new paper.Group();
                this._svgOuterLayer.addChild(objectsGroup);
    
                rootTimeline.view.render();
                this.model.focus.view.group.remove();
                rootTimeline.view.frameLayers.forEach(layer => {
                    objectsGroup.addChild(layer);
                });
    
                // Apply visual effects
                var transformations = [];
                var clipIteration = this.model.focus;
                while (!clipIteration.isRoot) {
                    transformations.push(clipIteration.transformation);
                    clipIteration = clipIteration.parentClip;
                }
                transformations.reverse();
                transformations.forEach(transform => {
                    this._svgOuterLayer.translate(-transform.x, -transform.y);
                    this._svgOuterLayer.rotate(-transform.rotation, new paper.Point());
                    this._svgOuterLayer.scale(1 / transform.scaleX, 1 / transform.scaleY, new paper.Point());
                });

                objectsGroup.opacity = this.model.toolSettings.getSetting('outsideClipStandardOpacity');
            }
        }

        // Generate frame layers
        this.model.focus.timeline.view.render();
        this.model.focus.timeline.view.frameLayers.forEach(layer => {
            this.paper.project.addLayer(layer);
            if (this.model.project &&
                this.model.project.activeFrame &&
                !layer.locked &&
                (layer.data.wickType === 'paths' || layer.data.wickType === 'clipsandpaths') &&
                layer.data.wickUUID === this.model.project.activeFrame.uuid) {
                layer.activate();
            }
        });

        // Render selection
        this.model.selection.view.render();
        this.paper.project.addLayer(this.model.selection.view.layer);

        // Render GUI Layer
        this._svgGUILayer.removeChildren();
        this._svgGUILayer.locked = true;
        if(this.model.showClipBorders && !this.model.playing && !this.model.isPublished) {
            this._svgGUILayer.addChildren(this._generateClipBorders());
            this.paper.project.addLayer(this._svgGUILayer);
        }

        // Render black bars (for published projects)
        if(this.model.isPublished && this.model.renderBlackBars) {
            this._svgBordersLayer.removeChildren();
            this._svgBordersLayer.addChildren(this._generateSVGBorders());
            this.paper.project.addLayer(this._svgBordersLayer);
        }
    }

    _generateSVGCanvasStage() {
        var stage = new paper.Path.Rectangle(
            new this.paper.Point(0, 0),
            new this.paper.Point(this.model.width, this.model.height),
        );
        stage.remove();
        stage.fillColor = this.model.backgroundColor.rgba;

        return stage;
    }

    _generateSVGOriginCrosshair() {
        var originCrosshair = new this.paper.Group({ insert: false });

        var vertical = new paper.Path.Line(
            new this.paper.Point(0, -Wick.View.Project.ORIGIN_CROSSHAIR_SIZE),
            new this.paper.Point(0, Wick.View.Project.ORIGIN_CROSSHAIR_SIZE)
        );
        vertical.strokeColor = Wick.View.Project.ORIGIN_CROSSHAIR_COLOR;
        vertical.strokeWidth = Wick.View.Project.ORIGIN_CROSSHAIR_THICKNESS / this.paper.view.zoom;

        var horizontal = new paper.Path.Line(
            new this.paper.Point(-Wick.View.Project.ORIGIN_CROSSHAIR_SIZE, 0),
            new this.paper.Point(Wick.View.Project.ORIGIN_CROSSHAIR_SIZE, 0)
        );
        horizontal.strokeColor = Wick.View.Project.ORIGIN_CROSSHAIR_COLOR;
        horizontal.strokeWidth = Wick.View.Project.ORIGIN_CROSSHAIR_THICKNESS / this.paper.view.zoom;

        originCrosshair.addChild(vertical);
        originCrosshair.addChild(horizontal);

        originCrosshair.position.x = 0;
        originCrosshair.position.y = 0;

        return originCrosshair;
    }

    /* Renders the off-screen borders that hide content out of the project bounds. */
    _generateSVGBorders() {
        /**
         * +----------------------------+
         * |             top            +
         * +----------------------------+
         * +-----+ +------------+ +-----+
         * |left | |   canvas   | |right|
         * +-----+ +------------+ +-----+
         * +----------------------------+
         * |           bottom           +
         * +----------------------------+
         */

        var borderMin = -10000,
            borderMax = 10000;
        var strokeOffset = 0.5; // prevents gaps between border rects

        var bottom = this.model.height;
        var right = this.model.width;

        if (this.model.publishedMode === "imageSequence") {
            bottom *= window.devicePixelRatio;
            right *= window.devicePixelRatio;
        }

        var borderPieces = [
            // top
            new paper.Path.Rectangle({
                from: new paper.Point(borderMin, borderMin),
                to: new paper.Point(borderMax, strokeOffset),
                fillColor: 'black',
                strokeWidth: 0,
                strokeColor: 'black',
            }),
            // bottom
            new paper.Path.Rectangle({
                from: new paper.Point(borderMin, (bottom)-strokeOffset),
                to: new paper.Point(borderMax, borderMax),
                fillColor: 'black',
                strokeWidth: 0,
                strokeColor: 'black',
            }),
            // left
            new paper.Path.Rectangle({
                from: new paper.Point(borderMin, -strokeOffset),
                to: new paper.Point(-strokeOffset, (bottom)+strokeOffset),
                fillColor: 'black',
                strokeWidth: 1,
                strokeColor: 'black',
            }),
            // right
            new paper.Path.Rectangle({
                from: new paper.Point((right)+strokeOffset, -strokeOffset),
                to: new paper.Point(borderMax, borderMax),
                fillColor: 'black',
                strokeWidth: 1,
                strokeColor: 'black',
            }),
        ];

        var border = new paper.Group();
        border.applyMatrix = false;
        border.addChildren(borderPieces);

        // Adjust borders based on zoom/pan (this fixes borders hiding things while using a vcam)
        border.scaling = new paper.Point(this.model.zoom, this.model.zoom);
        border.position = new paper.Point(-this.model.pan.x, -this.model.pan.y);

        return border;
    }

    _generateClipBorders() {
        var clipBorders = [];

        this.model.activeFrames.filter(frame => {
            return !frame.parentLayer.hidden;
        }).forEach(frame => {
            var clips = frame.clips.filter(clip => {
                return !clip.isSelected;
            });
            clips.forEach(clip => {
                var clipBorder = clip.view.generateBorder();
                clipBorders.push(clipBorder);
            });
        });

        return clipBorders;
    }

    _applyZoomAndPanChangesFromPaper() {
        // limit zoom to min and max
        this.paper.view.zoom = Math.min(Wick.View.Project.ZOOM_MAX, this.paper.view.zoom);
        this.paper.view.zoom = Math.max(Wick.View.Project.ZOOM_MIN, this.paper.view.zoom);

        // limit pan
        this.pan.x = Math.min(Wick.View.Project.PAN_LIMIT, this.pan.x);
        this.pan.x = Math.max(-Wick.View.Project.PAN_LIMIT, this.pan.x);
        this.pan.y = Math.min(Wick.View.Project.PAN_LIMIT, this.pan.y);
        this.pan.y = Math.max(-Wick.View.Project.PAN_LIMIT, this.pan.y);

        this.model.pan = {
            x: this.pan.x,
            y: this.pan.y,
        };

        this.zoom = this.paper.view.zoom;
        this.model.zoom = this.zoom;

        this.render();
    }
}
