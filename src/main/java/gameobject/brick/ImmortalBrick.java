package gameobject.brick;


import javafx.scene.canvas.GraphicsContext;
import javafx.scene.image.Image;
import javafx.scene.paint.Color;

import process.PlayingProcess;

public class ImmortalBrick extends Brick {

    public ImmortalBrick(double x, double y, double width, double height, int locateX,
            int locateY) {
        super(x, y, width, height, locateX, locateY, 8);
    }

    private Image brickImage = LoadImage.getImage("/image/immortal.png");

    @Override
    public void render(GraphicsContext gc) {
        if (brickImage != null) {
            gc.drawImage(brickImage, getX(), getY(), getWidth(), getHeight());
        } else {
            System.out.println("brickImage is null");
            gc.setFill(Color.RED);
            gc.fillRect(getX(), getY(), getWidth(), getHeight());
        }
    }

    @Override
    public void takeHit() {
        hitPoints -= 6;
    }

    @Override
    public void upHitPoint() {
        hitPoints = Math.min(8, hitPoints + 1);
    }

    @Override
    public void update(PlayingProcess gameManager) {}
}
