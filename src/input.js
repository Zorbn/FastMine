export class Input {
    constructor() {
        this.pressedKeys = new Set();
        this.pressedMouseButtons = new Set();
        this.keyWasPressed = new Set();
        this.mouseButtonWasPressed = new Set();
        this.firstClick = true;
    }

    isKeyPressed = (key) => {
        return this.pressedKeys.has(key);
    }

    wasKeyPressed = (key) => {
        return this.keyWasPressed.has(key);
    }

    wasMouseButtonPressed = (button) => {
        return this.mouseButtonWasPressed.has(button);
    }

    isMouseButtonPressed = (button) => {
        return this.pressedMouseButtons.has(button);
    }

    update = () => {
        this.keyWasPressed.clear();
        this.mouseButtonWasPressed.clear();
    }

    addListeners = (onMouseMove, onFirstClick) => {
        document.addEventListener("click", () => {
            document.body.requestPointerLock({
                // Get raw mouse input. This prevents
                // occasional mouse snapping, and keeps
                // the experience consistent despite OS
                // settings.
                unadjustedMovement: true,
            });

            if (this.firstClick) {
                onFirstClick();
            }

            this.firstClick = false;
        });

        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement == document.body) {
                document.addEventListener("mousemove", onMouseMove);
            } else {
                document.removeEventListener("mousemove", onMouseMove);
                this.pressedKeys.clear();
                this.pressedMouseButtons.clear();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (!this.pressedKeys.has(event.code)) {
                this.keyWasPressed.add(event.code);
            }

            this.pressedKeys.add(event.code);
        })
        document.addEventListener("keyup", (event) => {
            this.pressedKeys.delete(event.code);
        })

        document.addEventListener("mousedown", (event) => {
            if (!this.pressedMouseButtons.has(event.button)) {
                this.mouseButtonWasPressed.add(event.button);
            }

            this.pressedMouseButtons.add(event.button);
        })
        document.addEventListener("mouseup", (event) => {
            this.pressedMouseButtons.delete(event.button);
        })
    }
}