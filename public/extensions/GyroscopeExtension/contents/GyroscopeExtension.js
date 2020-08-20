class GyroscopeExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._active = false;
        this._debug = options.debug;
        this._toolbarGroup = null;
        this._toolbarButton = null;
        this._debugPanel = null;
        this._initialCameraPosition = null;
        this._initialCameraDirection = null;
        this._initialCameraUp = null;
        this._onOrientationChangeBound = this._onOrientationChange.bind(this);
    }

    load() {
        this._createUI();
        console.log('GyroscopeExtension loaded.');
        return true;
    }

    unload() {
        if (this._active) {
            this._deactivate();
        }
        this._removeUI();
        console.log('GyroscopeExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._createUI();
    }

    _createUI() {
        if (this.viewer.toolbar && !this._toolbarGroup) {
            this._toolbarGroup = new Autodesk.Viewing.UI.ControlGroup('gyroscopeExtensionToolbar');
            this.viewer.toolbar.addControl(this._toolbarGroup);
            this._toolbarButton = new Autodesk.Viewing.UI.Button('gyroscopeExtensionButton');
            // iOS 13 requires the Device Orientation permission to be requested in reaction to a user action,
            // so we cannot use `this._toolbarButton.onClick`...
            this._toolbarButton.container.addEventListener('click', (ev) => {
                this._active = !this._active;
                if (this._active) {
                    if (DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) {
                        DeviceOrientationEvent.requestPermission()
                            .then(response => {
                                if (response === 'granted') {
                                    this._activate();
                                } else {
                                    if (this._debugPanel) {
                                        this._debugPanel.innerText = `Unexpected response: ${response}`;
                                    } else {
                                        console.error(`Unexpected response: ${response}`);
                                    }
                                }
                            })
                            .catch(err => {
                                if (this._debugPanel) {
                                    this._debugPanel.innerText = `Error: ${err}`;
                                } else {
                                    console.error(`Error: ${err}`);
                                }
                            });
                    } else {
                        this._activate();
                    }
                } else {
                    this._deactivate();
                }
            });
            this._toolbarButton.setToolTip('Gyroscope');
            this._toolbarGroup.addControl(this._toolbarButton);

            if (this._debug) {
                this._debugPanel = document.createElement('div');
                this._debugPanel.innerHTML = 'Alpha:';
                this._debugPanel.classList.add('gyroscopeExtensionDebug');
            }
        }
    }

    _removeUI() {
        if (this._toolbarGroup) {
            this.viewer.toolbar.removeControl(this._toolbarGroup);
        }
    }

    _activate() {
        this._toolbarButton.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
        this.viewer.container.appendChild(this._debugPanel);
        this._initialCameraPosition = this.viewer.navigation.getPosition();
        this._initialCameraDirection = this.viewer.navigation.getTarget().sub(this._initialCameraPosition);
        this._initialCameraUp = this.viewer.navigation.getCameraUpVector();
        window.addEventListener('deviceorientation', this._onOrientationChangeBound, true);
    }

    _deactivate() {
        window.removeEventListener('deviceorientation', this._onOrientationChangeBound);
        this._initialCameraPosition = null;
        this._initialCameraTarget = null;
        this._initialCameraUp = null;
        this.viewer.container.removeChild(this._debugPanel);
        this._toolbarButton.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
    }

    _onOrientationChange(ev) {
        if (this._debug) {
            this._debugPanel.innerText = `Alpha: ${ev && ev.alpha}`;
        }
        let newCameraDirection = this._initialCameraDirection.clone().applyAxisAngle(this._initialCameraUp, Math.PI * ev.alpha / 180.0);
        this.viewer.navigation.setTarget(newCameraDirection.add(this._initialCameraPosition));
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('GyroscopeExtension', GyroscopeExtension);