package gameobject.brick;

import javafx.scene.image.Image;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;


public class LoadImage {
    private static final Map<String, Image> imageMap = new HashMap<>();

    public static Image getImage(String resourcePath) {

        if (imageMap.containsKey(resourcePath)) {
            return imageMap.get(resourcePath);
        }

        Image image = null;
        try {
            InputStream is = LoadImage.class.getResourceAsStream(resourcePath);
            if (is == null) {
                System.err.println("Lỗi: Không tìm thấy tài nguyên: " + resourcePath);
                return null;
            }
            image = new Image(is);
            if (image.isError()) {
                System.err.println("Lỗi tải ảnh (resource): " + resourcePath + " - "
                        + image.exceptionProperty().get().getMessage());
                image = null;
            } else {
                imageMap.put(resourcePath, image);
            }
            is.close();
        } catch (Exception e) {
            System.err.println("Lỗi tải ảnh (Exception từ resource): " + resourcePath + " - "
                    + e.getMessage());
        }
        return image;
    }

    public static void preloadImages() {
        getImage("/image/gach_do.png");
        getImage("/image/gach_bat_tu.png");
        getImage("/image/gach_la_cay.png");
        System.out.println("Đã tải trước " + imageMap.size() + " hình ảnh.");
    }

    public static void clearCache() {
        imageMap.clear();
        System.out.println("Image cache đã được xóa.");
    }
}
