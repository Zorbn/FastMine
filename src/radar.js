const radarCanvas = document.getElementById("radar");
const radarCtx = radarCanvas.getContext("2d");
const markerSize = 5;

export class Radar {
    drawMarker = (x, y, color) => {
        radarCtx.fillStyle = color;
        radarCtx.fillRect(x, y, markerSize, markerSize);
    }
    draw = (player, hatch, enemies) => {
        const scale = 200 / 64;

        radarCtx.fillStyle = "black";
        radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);

        for (let enemy of enemies) {
            this.drawMarker(
                enemy.x * scale,
                enemy.z * scale,
                "red",
            );
        }

        this.drawMarker(player.x * scale, player.z * scale, "white");
        this.drawMarker(hatch.x * scale, hatch.z * scale, "green");
    }
}