package map;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Random;

public class CreatSpecialBrick {
    private List<Map> listOfMaps;
    private int rows;
    private int cols;

    public CreatSpecialBrick(List<Map> listOfMaps, int rows, int cols) {
        this.rows = rows;
        this.cols = cols;
        this.listOfMaps = listOfMaps;
    }

    public void readImmortal() {
        final String RESOURCE_PATH = "/staticMap/immortalMap.txt";

        try (InputStream is = LoadImage.class.getResourceAsStream(RESOURCE_PATH)) {
            if (is == null) {
                System.err.println("LỖI NGHIÊM TRỌNG: Không tìm thấy file tại " + RESOURCE_PATH);
                return;
            }
            try (BufferedReader br =
                    new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                int row = 0;
                int[][] currentMap = new int[rows][cols];

                while ((line = br.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) {
                        continue;
                    }
                    if (line.charAt(0) == '#') {
                        if (row > 0) {
                            listOfMaps.add(new Map(deepCopy(currentMap)));
                            currentMap = new int[rows][cols];
                            row = 0;
                        }
                    } else {
                        String[] parts = line.split("\\s+");
                        for (int i = 0; i < parts.length && i < cols; i++) {
                            currentMap[row][i] = Integer.parseInt(parts[i]);
                        }
                        row++;
                        if (row >= rows) {
                            listOfMaps.add(new Map(deepCopy(currentMap)));
                            currentMap = new int[rows][cols];
                            row = 0;
                        }
                    }
                }
                if (row > 0) {
                    listOfMaps.add(new Map(currentMap));
                }
            }
        } catch (IOException e) {
            System.err.println("Lỗi I/O khi đọc file immortalMap.txt");
            e.printStackTrace();
        } catch (NumberFormatException e) {
            System.err.println("Lỗi định dạng số trong file immortalMap.txt");
            e.printStackTrace();
        }
    }

    private int[][] deepCopy(int[][] original) {
        if (original == null)
            return null;
        final int[][] result = new int[original.length][];
        for (int i = 0; i < original.length; i++) {
            result[i] = original[i].clone();
        }
        return result;
    }

    private void creatWithId(int id, int level, int so_luong) {
        Random rand = new Random();
        int x, y;
        int[][] map = listOfMaps.get(level - 1).getMap();
        int num = 5000;
        while (so_luong > 0 && num > 0) {
            x = rand.nextInt(rows);
            y = rand.nextInt(cols);
            if (map[x][y] == 1) {
                map[x][y] = id;
                so_luong--;
            }
            num--;
        }
    }

    public void creatSpecialBrick() {
        for (int level = 1; level <= 20; level++) {
            if (level >= 7) {
                int immortal = level;
                if (level >= 10)
                    immortal += 3;
                if (level >= 13)
                    immortal += 2;
                creatWithId(2, level, immortal);
            }
            int lifeUp = Math.min(3, 1 + level / 5);
            int gold = lifeUp;
            int fallBomb = Math.min(10,
                    level / 3 + level / 6 + level / 8 + level / 10 + level / 12 + level / 14);
            int areaBlast = Math.min(5, fallBomb);
            if (level >= 7) {
                int push = Math.min(6, level / 2);
                if (level >= 10)
                    push += 1;
                if (level >= 13)
                    push += 1;
                creatWithId(8, level, push);
            }
            int wheel = Math.min(3, level / 5);
            creatWithId(3, level, lifeUp);
            creatWithId(4, level, gold);
            creatWithId(5, level, fallBomb);
            creatWithId(6, level, wheel);
            creatWithId(7, level, areaBlast);
        }
    }
}

