package map;

import java.util.*;

public class DFS {
  protected int rows, cols;

  public DFS(int rows, int cols) {
    this.rows = rows;
    this.cols = cols;
  }

  private boolean isValid(int x, int y) {
    return x >= 0 && x < rows && y >= 0 && y < cols;
  }

  public int createMap(int map[][], int x, int y, int id, int n_max) {
    int[] dx = {0, 0, 1, -1};
    int[] dy = {1, -1, 0, 0};
    map[x][y] = id;
    Random rand = new Random();
    List<Integer> directions = new ArrayList<>();
    for (int i = 0; i < 4; i++) {
      directions.add(i);
    }
    int n = rand.nextInt(8) + 1;
    if (n >= 5) {
      n = rand.nextInt(8) + 1;
    }
    if (n >= 5) {
      n = rand.nextInt(8) + 1;
    }
    int count = 1;
    n_max--;
    Deque<Pair<Integer, Integer>> stack = new ArrayDeque<>();
    stack.push(new Pair<>(x, y));
    while (count < n && n_max > 0) {
      if (stack.isEmpty())
        break;
      Pair<Integer, Integer> current = stack.removeLast();
      x = current.first;
      y = current.second;
      java.util.Collections.shuffle(directions);
      int k = rand.nextInt(2) + 1;
      int madeMove = 0;
      for (int dir : directions) {
        if (madeMove >= k || count >= n) {
          break;
        }
        int nx = x + dx[dir];
        int ny = y + dy[dir];
        if (isValid(nx, ny) && map[nx][ny] == 0) {
          stack.addFirst(new Pair<>(nx, ny));
          map[nx][ny] = id;
          count++;
          madeMove++;
          n_max--;
        }
      }
    }

    return n_max;
  }
}
