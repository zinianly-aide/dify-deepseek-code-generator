import java.sql.*;

public class DatabaseQueryExample {
    public static void main(String[] args) {
        Connection conn = null;
        PreparedStatement pstmt = null;
        ResultSet rs = null;
        
        try {
            // 1. 建立数据库连接
            Class.forName("com.mysql.cj.jdbc.Driver");
            String url = "jdbc:mysql://localhost:3306/testdb";
            String username = "root";
            String password = "password";
            conn = DriverManager.getConnection(url, username, password);
            
            // 2. 准备SQL查询
            String sql = "SELECT id, name, email FROM users WHERE age > ?";
            pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, 18); // 设置参数
            
            // 3. 执行查询
            rs = pstmt.executeQuery();
            
            // 4. 处理结果
            while (rs.next()) {
                int id = rs.getInt("id");
                String name = rs.getString("name");
                String email = rs.getString("email");
                System.out.println("ID: " + id + ", Name: " + name + ", Email: " + email);
            }
            
        } catch (ClassNotFoundException | SQLException e) {
            e.printStackTrace();
        } finally {
            // 5. 释放资源
            try {
                if (rs != null) rs.close();
                if (pstmt != null) pstmt.close();
                if (conn != null) conn.close();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
    }
}