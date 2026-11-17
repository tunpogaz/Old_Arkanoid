package gameobject.brick;


import gameobject.GameObject;

public abstract class Brick extends GameObject {
  protected int hitPoints;
  public int locateX;
  public int locateY;
  public int left;
  public int right;
  public int movedist;

  Brick(double x, double y, double w, double h, int locateX, int locateY, int hp) {
    super(x, y, w, h);
    this.hitPoints = hp;
    this.locateX = locateX;
    this.locateY = locateY;
    this.movedist = 0;
    right = (int) x;
    left = (int) x;
  }

  public void ha_do_cao(int k) {
    setY(getY() + k);
  }

  public void dich_trai_phai() {
    if (movedist == 0 || left == right) {
      return;
    }

    if (getX() + movedist > right || getX() + movedist < left) {
      movedist = -movedist;
    }
    setX(getX() + movedist);
  }


  public abstract void takeHit();

  public void upHitPoint() {}

  public boolean isDestroyed() {
    return hitPoints <= 0;
  }
}
