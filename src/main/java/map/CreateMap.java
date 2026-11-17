package map;

import java.util.Random;

public class CreateMap {
    int rows;
    int cols;
    int level;

    public CreateMap(int rowls, int cols, int level) {
        this.rows = rowls;
        this.cols = cols;
        this.level = level;
    }

    int[] getCountBrickforLevel =
            {7, 16, 27, 28, 30, 30, 31, 36, 36, 41, 42, 60, 70, 55, 55, 85, 90, 90, 100, 104};

    public int[][] creatMap(int[][] map) {
        int m = 0;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (map[i][j] != 0) {
                    m++;
                }
            }
        }

        int n = getCountBrickforLevel[level - 1] - m;
        DFS dfs = new DFS(rows, cols);
        for (int i = 1; i < 5000; i++) {
            Random rand = new Random();
            int x = rand.nextInt(rows);
            int y = rand.nextInt(cols);
            if (map[x][y] == 0 && n > 0) {
                n = dfs.createMap(map, x, y, 1, n);
            }

            if (n <= 0) {
                break;
            }
        }

        return map;
    }
}
